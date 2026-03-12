import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "placeholder-key";
const genAI = new GoogleGenerativeAI(apiKey);

export const getGeminiResponse = async (
  systemInstruction: string,
  history: { role: string; parts: { text: string }[] }[]
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  // If history is empty, we're doing an initial greeting
  if (history.length === 0) {
    try {
      const result = await model.generateContent("Please start the negotiation with an opening statement.");
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Gemini Greeting error:", error);
      throw error;
    }
  }

  // Last message is the user prompt
  const userMessage = history[history.length - 1];
  // Previous messages for context (excluding the last one)
  const chatHistory = history.slice(0, -1);

  const chat = model.startChat({
    history: chatHistory,
  });

  try {
    const result = await chat.sendMessage(userMessage.parts[0].text);
    const response = await result.response;
    const text = response.text();
    
    // Attempt to extract JSON from the response text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
};
