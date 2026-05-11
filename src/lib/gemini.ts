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

      // SSE lines are separated by newlines
      const lines = accumulatedText.split('\n');
      accumulatedText = lines.pop() || ""; // Keep the last partial line

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const data = JSON.parse(dataStr);
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            fullText += content;
          } catch (e) {
            // Ignore incomplete JSON chunks
          }
        }
      }
    }

    // Process the final accumulated text
    // Strip markdown code blocks if any
    let cleanText = fullText.replace(/^```(json)?|```$/gm, '').trim();
    
    // Find the first { or [ and the last } or ]
    const startIdx = Math.min(
      cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : Infinity,
      cleanText.indexOf('[') !== -1 ? cleanText.indexOf('[') : Infinity
    );
    const endIdx = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));
    
    if (startIdx !== Infinity && endIdx !== -1) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    return JSON.parse(cleanText);

  } catch (error) {
    console.error("Gemini Proxy API error:", error);
    throw error;
  }
};
