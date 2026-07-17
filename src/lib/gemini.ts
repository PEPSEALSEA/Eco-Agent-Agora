import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseGeminiJson, repairGeminiJsonText } from "@/lib/parseGeminiJson";

type GeminiContent = { role: string; parts: { text: string }[] };

/**
 * Gemini requires history to start with 'user' and prefer alternating roles.
 * Negotiation saves AI opening lines first, so raw history often starts with 'model'.
 */
export function sanitizeGeminiHistory(history: GeminiContent[]): GeminiContent[] {
  let start = 0;
  while (start < history.length && history[start].role !== "user") {
    start++;
  }

  const merged: GeminiContent[] = [];
  for (const item of history.slice(start)) {
    const text = item.parts?.[0]?.text ?? "";
    if (!text.trim()) continue;

    const role = item.role === "user" ? "user" : "model";
    const last = merged[merged.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n${text}`;
    } else {
      merged.push({ role, parts: [{ text }] });
    }
  }

  return merged;
}

export const getGeminiResponse = async (
  systemInstruction: string,
  history: GeminiContent[],
  onStream?: (text: string) => void,
  apiKey?: string
): Promise<any> => {
  try {
    const contextKey = (apiKey && apiKey !== "undefined" && apiKey !== "null") ? apiKey : null;
    const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const effectiveKey = (contextKey || envKey || "").trim();

    if (!effectiveKey) {
      throw new Error("No Gemini API key found. Please check your configuration.");
    }

    const genAI = new GoogleGenerativeAI(effectiveKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction,
    });

    const sanitized = sanitizeGeminiHistory(history);
    const last = sanitized[sanitized.length - 1];
    const hasUserTurn = last?.role === "user";
    const prior = hasUserTurn
      ? sanitizeGeminiHistory(sanitized.slice(0, -1))
      : sanitized;

    const chat = model.startChat({
      history: prior,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const lastMessage = hasUserTurn
      ? last.parts[0].text
      : "Please start the negotiation with an opening statement.";

    const result = await chat.sendMessageStream(lastMessage);
    
    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      if (onStream) {
        onStream(fullText);
      }
    }

    try {
      return parseGeminiJson(fullText);
    } catch (e: any) {
      const cleanText = repairGeminiJsonText(fullText);
      console.warn("Standard JSON parse failed, attempting emergency extraction...");
      try {
        const dialogueMatch = fullText.match(/"dialogue":\s*(\[[\s\S]*?\])/);
        const stateMatch = fullText.match(/"state_delta":\s*(\{[\s\S]*?\})/);
        const narratorMatch = fullText.match(/"narrator":\s*"([^"]*)"/);
        
        if (dialogueMatch) {
          return {
            dialogue: JSON.parse(dialogueMatch[1].replace(/,\s*\]/, ']')),
            state_delta: stateMatch ? JSON.parse(stateMatch[1].replace(/,\s*\}/, '}')) : {},
            narrator: narratorMatch ? narratorMatch[1] : ""
          };
        }
      } catch (innerE) {
        console.error("Emergency extraction failed too");
      }

      console.error("Final JSON parse error:", e, "Cleaned text:", cleanText);
      throw new Error(`Invalid JSON response: ${e.message}`);
    }

  } catch (error: any) {
    console.error("Gemini API error:", error);
    if (error.message?.includes("fetch failed")) {
      throw new Error("Network error: Could not reach Gemini API. This might be a CORS issue if calling directly from the browser without a proxy.");
    }
    throw error;
  }
};
