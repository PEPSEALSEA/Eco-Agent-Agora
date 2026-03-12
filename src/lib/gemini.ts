import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "placeholder-key";
const genAI = new GoogleGenerativeAI(apiKey);

export const getGeminiResponse = async (
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[]
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const chat = model.startChat({
    history: history.slice(0, -1), // Previous history
  });

  const lastMessage = history[history.length - 1].parts[0].text;

  try {
    const result = await chat.sendMessage(`System Prompt: ${systemPrompt}\n\nUser Message: ${lastMessage}`);
    const response = await result.response;
    const text = response.text();
    
    // Attempt to extract JSON from the response text
    // Sometimes the model returns ```json ... ``` even with responseMimeType: "application/json"
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
};
