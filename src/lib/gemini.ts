import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseGeminiJson, repairGeminiJsonText } from "@/lib/parseGeminiJson";

export const getGeminiResponse = async (
  systemInstruction: string,
  history: { role: string; parts: { text: string }[] }[],
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
      model: "gemini-2.5-flash", // Reverting to user's preferred version
      systemInstruction: systemInstruction,
    });

    const chat = model.startChat({
      history: history.length > 0 ? history.slice(0, -1) : [],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const lastMessage = history.length > 0 
      ? history[history.length - 1].parts[0].text 
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
      // Last resort: If still failing, try to extract just the dialogue part via regex
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
