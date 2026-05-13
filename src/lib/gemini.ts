import { GoogleGenerativeAI } from "@google/generative-ai";

export const getGeminiResponse = async (
  systemInstruction: string,
  history: { role: string; parts: { text: string }[] }[],
  onStream?: (text: string) => void,
  apiKey?: string
) => {
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

    // Process the final accumulated text
    let cleanText = fullText.replace(/^```(json)?|```$/gm, '').trim();
    
    // Find the first { or [ and the last } or ] to isolate the JSON object
    const startIdx = Math.min(
      cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : Infinity,
      cleanText.indexOf('[') !== -1 ? cleanText.indexOf('[') : Infinity
    );
    const endIdx = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));
    
    if (startIdx !== Infinity && endIdx !== -1) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    try {
      return JSON.parse(cleanText);
    } catch (e: any) {
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
