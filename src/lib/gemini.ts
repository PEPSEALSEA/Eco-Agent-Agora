const proxyUrl = process.env.NEXT_PUBLIC_GEMINI_PROXY_URL || "https://gemini-proxy.sealseapep.workers.dev/";

export const getGeminiResponse = async (
  systemInstruction: string,
  history: { role: string; parts: { text: string }[] }[]
) => {
  const payload = {
    contents: history.length === 0 
      ? [{ role: "user", parts: [{ text: "Please start the negotiation with an opening statement." }] }]
      : history,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");

    const decoder = new TextDecoder();
    let fullText = "";
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      accumulatedText += chunk;

      const lines = accumulatedText.split('\n');
      accumulatedText = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
        
        const dataStr = trimmedLine.substring(6).trim();
        if (dataStr === '[DONE]') break;
        
        try {
          const data = JSON.parse(dataStr);
          const parts = data.candidates?.[0]?.content?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.text) fullText += part.text;
            }
          }
        } catch (e) {
          // Log parsing errors for debugging but don't crash the loop
          console.warn("Error parsing SSE chunk:", e, "Line:", trimmedLine);
        }
      }
    }

    if (!fullText) {
      throw new Error("No response content received from Gemini");
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
    } else {
      console.error("Failed to find JSON boundaries in response:", cleanText);
    }

    try {
      return JSON.parse(cleanText);
    } catch (e: any) {
      console.error("Final JSON parse error:", e, "Cleaned text:", cleanText);
      throw new Error(`Invalid JSON response: ${e.message}`);
    }

  } catch (error) {
    console.error("Gemini Proxy API error:", error);
    throw error;
  }
};
