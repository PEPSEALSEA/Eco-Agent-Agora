import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
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
  
  // Combine system prompt with the request to ensure it follows the format
  const result = await chat.sendMessage(`System Prompt: ${systemPrompt}\n\nUser Message: ${lastMessage}`);
  const response = await result.response;
  return JSON.parse(response.text());
};
