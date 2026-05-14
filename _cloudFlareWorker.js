/**
 * Cloudflare Worker for Eco-Agent Agora
 * Replaces Google Apps Script for low-latency Sheets & Gemini interaction.
 */

const SYSTEM_INSTRUCTION_TEMPLATE = `
# Role: Antigravity Negotiation Expert
คุณคือ AI นักเจรจาที่มีความฉลาดทางอารมณ์สูง (High EQ) และมีความสามารถในการ "ลอยตัวเหนือความขัดแย้ง"
สวมบทบาทเป็นตัวละครใน Scenario อย่างแนบเนียนที่สุด ให้ความรู้สึกเหมือนกำลังคุยกับมนุษย์จริงๆ ที่มีอารมณ์ มีความเห็น และมีเป้าหมายส่วนตัว

# LAYER 1: Scenario Config (Immutable)
{{scenario_config}}

# LAYER 2: Runtime State (Current)
{{runtime_state}}

# LAYER 3: Context & History Summary
Summary of previous turns: {{history_summary}}

# RESPONSE GUIDELINES
1. **Analyze State Delta**: ตรวจสอบว่าคำพูดของผู้ใช้ส่งผลต่อ trust, anger หรือความก้าวหน้าใน phase อย่างไร
2. **Multi-Character Dialogue**: ตอบกลับในนามของตัวละครที่ Unlocked เท่านั้น (unlocked_characters)
3. **DO NOT PARROT/COPY**: ห้ามทวนคำพูดของผู้ใช้หรือลอกประโยคที่ผู้ใช้ป้อนมาโดยเด็ดขาด! ให้ตอบกลับอย่างเป็นธรรมชาติในมุมมองและนิสัยของตัวละครนั้นๆ คุณมีความคิดเป็นของตัวเอง
4. **Natural Conversation**: ใช้ภาษาพูดที่เป็นธรรมชาติ หลีกเลี่ยงการพูดเป็นแพทเทิร์นหุ่นยนต์ มีการโต้แย้ง เห็นด้วย หรือเสนอทางเลือกใหม่ตามบุคลิกของตัวละคร
5. **Phase & Game Over**: 
   - 'none': ดำเนินการเจรจาปกติ
   - 'advance_to_next_phase': เมื่อผู้ใช้ทำตาม win_condition ของ Phase ปัจจุบันสำเร็จ
   - 'game_over_win': เมื่อผู้ใช้ทำตามเป้าหมายหลักสำเร็จทั้งหมด (ปิดดีลได้, หาข้อสรุปได้) และไม่มี Phase ถัดไป
   - 'game_over_fail': เมื่อการเจรจาล้มเหลวอย่างรุนแรง หรือละเมิด fail_condition
6. **Structured JSON**: คุณต้องตอบกลับเป็น JSON format ตามโครงสร้างด้านล่างนี้เสมอ

# RESPONSE FORMAT (JSON ONLY)
{
  "dialogue": [
    { "char": "character_id", "line": "ข้อความภาษาไทย..." }
  ],
  "state_delta": {
    "relationships.char_id.trust": "+1/-1",
    "relationships.char_id.anger": "+1/-1",
    "resolved_issues": ["add item if resolved"],
    "phase_flags.key": "value"
  },
  "phase_event": "advance_to_next_phase | game_over_win | game_over_fail | none",
  "narrator": "บรรยายสั้นๆ เกี่ยวกับบรรยากาศหรือท่าทางของตัวละคร"
}
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. CORS Handling
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
        },
      });
    }

    try {
      // 2. Authentication (Parity with GAS SECRET_KEY)
      const isAuthorized = authenticate(url, await request.clone().json().catch(() => ({})), env);
      if (!isAuthorized) return errorResponse("Unauthorized", 401);

      const token = await getGoogleAccessToken(env);
      
      const path = url.pathname;
      const params = url.searchParams;

      // --- GET Actions ---
      if (request.method === "GET") {
        const action = params.get("action");
        const table = params.get("table");

        if (action === "read") {
          const data = await readTable(env.SHEET_ID, table, token);
          return jsonResponse(data);
        }

        if (action === "read_all") {
          const tables = ["users", "scenarios", "sessions", "messages", "feedback_logs", "skill_progress"];
          const results = await Promise.all(tables.map(t => readTable(env.SHEET_ID, t, token)));
          const result = {};
          tables.forEach((t, i) => { result[t] = results[i]; });
          return jsonResponse(result);
        }

        if (action === "get_negotiation_data") {
          const sessionId = params.get("sessionId");
          const data = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
          return jsonResponse(data);
        }
        
        return errorResponse("Invalid GET action", 400);
      }

      // --- POST Actions ---
      if (request.method === "POST") {
        const payload = await request.json();
        const action = payload.action;
        const data = payload.data;

        if (action === "chat") {
          const result = await handleChatAction(env, data, token);
          return jsonResponse(result);
        }

        if (action === "get_chat_context") {
          const result = await handleGetChatContext(env, data, token);
          return jsonResponse(result);
        }

        if (action === "process_chat_result") {
          const result = await handleProcessChatResult(env, data, token);
          return jsonResponse(result);
        }

        if (action === "end_session") {
          const result = await handleEndSession(env, data, token);
          return jsonResponse(result);
        }

        if (action === "save_evaluation") {
          await handleSaveEvaluation(env, data, token);
          return jsonResponse({ success: true });
        }

        if (action === "generate_evaluation") {
          const result = await handleGenerateEvaluation(env, data);
          return jsonResponse(result);
        }

        if (action === "generate_what_if") {
          const result = await handleGenerateWhatIf(env, data);
          return jsonResponse(result);
        }

        if (action === "create") {
          const result = await createRow(env.SHEET_ID, payload.table, payload.data, token);
          return jsonResponse(result);
        }

        if (action === "update") {
          const result = await updateRow(env.SHEET_ID, payload.table, payload.id, payload.data, token);
          return jsonResponse(result);
        }

        if (action === "upsert") {
          const result = await upsertRow(env.SHEET_ID, payload.table, payload.queryField, payload.queryValue, payload.data, token);
          return jsonResponse(result);
        }

        return errorResponse("Invalid POST action", 400);
      }

      return errorResponse("Method not allowed", 405);
    } catch (err) {
      console.error(err);
      return errorResponse(err.message, 500);
    }
  }
};

function authenticate(url, body, env) {
  const key = url.searchParams.get("key") || body.key;
  if (!env.SECRET_KEY) {
    console.error("Worker Error: SECRET_KEY is not set in environment/secrets.");
    return false;
  }
  return key === env.SECRET_KEY;
}

/**
 * --- GOOGLE AUTH HELPERS ---
 */

async function getGoogleAccessToken(env) {
  const clientEmail = env.GOOGLE_CLIENT_EMAIL;
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/generative-language";
  
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = b64(JSON.stringify({
    iss: clientEmail,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));

  const signature = await sign(header + "." + claim, privateKey);
  const jwt = header + "." + claim + "." + signature;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  if (!data.access_token) throw new Error("Auth Failed: " + JSON.stringify(data));
  return data.access_token;
}

function b64(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function sign(data, key) {
  const pemContents = key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  
  try {
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } catch (e) {
    throw new Error("Base64 Key Error: " + e.message);
  }
}

/**
 * --- SHEETS API HELPERS ---
 */

async function readTable(sheetId, tableName, token) {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:Z1000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.error) return { error: data.error.message };
    if (!data.values) return [];

    const headers = data.values[0];
    const rows = data.values.slice(1);

    return rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        // Only parse if it's a string that looks like JSON
        if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
          try { 
            const parsed = JSON.parse(val); 
            val = parsed;
          } catch (e) {}
        }
        obj[h] = val;
      });
      return obj;
    });
  } catch (err) {
    return [];
  }
}

async function createRow(sheetId, tableName, data, token) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:Z1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const headData = await response.json();
  const headers = headData.values ? headData.values[0] : Object.keys(data);

  const newRow = headers.map(h => {
    let val = data[h] || "";
    return typeof val === 'object' ? JSON.stringify(val) : val;
  });

  const appendResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [newRow] })
  });

  return await appendResponse.json();
}

async function updateRow(sheetId, tableName, id, data, token) {
  const tableData = await readTable(sheetId, tableName, token);
  const rowIndex = tableData.findIndex(r => String(r.id) === String(id));
  if (rowIndex === -1) throw new Error("ID not found: " + id);

  const headResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:Z1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const headers = (await headResponse.json()).values[0];

  const currentRow = tableData[rowIndex];
  const updatedRow = headers.map(h => {
    let val = data[h] !== undefined ? data[h] : currentRow[h];
    return typeof val === 'object' ? JSON.stringify(val) : val;
  });

  const range = `${tableName}!A${rowIndex + 2}`;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [updatedRow] })
  });

  return { success: true };
}

async function upsertRow(sheetId, tableName, queryField, queryValue, data, token) {
  const tableData = await readTable(sheetId, tableName, token);
  const existing = tableData.find(r => String(r[queryField]) === String(queryValue));
  
  if (existing) {
    return await updateRow(sheetId, tableName, existing.id, data, token);
  } else {
    return await createRow(sheetId, tableName, data, token);
  }
}

async function handleGetNegotiationData(sheetId, sessionId, token) {
  const sessions = await readTable(sheetId, "sessions", token);
  const session = sessions.find(s => String(s.id) === String(sessionId));
  if (!session) return { error: `Session ${sessionId} not found` };

  const scenarios = await readTable(sheetId, "scenarios", token);
  const scenario = scenarios.find(s => String(s.id) === String(session.scenario_id));
  if (!scenario) return { error: "Scenario not found" };

  const allMessages = await readTable(sheetId, "messages", token);
  const messages = allMessages.filter(m => String(m.session_id) === String(sessionId));

  return { session, scenario, messages };
}

/**
 * --- GEMINI CHAT LOGIC ---
 */

async function handleChatAction(env, data, token) {
  const { sessionId, text, vibe, intensity } = data;
  const context = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
  if (context.error) throw new Error(context.error);
  const { scenario, session, messages } = context;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const state = typeof session.state === 'string' ? JSON.parse(session.state || "{}") : (session.state || {});
  
  const systemPrompt = SYSTEM_INSTRUCTION_TEMPLATE
    .replace('{{scenario_config}}', JSON.stringify(scenario, null, 2))
    .replace('{{runtime_state}}', JSON.stringify(state, null, 2))
    .replace('{{history_summary}}', session.history_summary || 'None yet.');

  const contents = messages.slice(-10).map(m => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: (m.sender === 'ai' && m.character_name ? `[${m.character_name}]: ${m.content}` : m.content) }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: `[Detected Vibe: ${vibe || 'Neutral'}, Intensity: ${intensity || '0.5'}]\nUser: ${text}` }]
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents,
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
    })
  });

  const aiResult = await response.json();
  const rawResponseText = aiResult.candidates[0].content.parts[0].text;
  const content = JSON.parse(rawResponseText);

  // Background save AI message
  if (content.dialogue) {
    for (const d of content.dialogue) {
      await createRow(env.SHEET_ID, "messages", {
        id: crypto.randomUUID(),
        session_id: sessionId,
        sender: "ai",
        character_name: d.char,
        content: d.line,
        created_at: new Date().toISOString()
      }, token);
    }
  }

  // Update session state
  if (content.state_delta) {
    Object.keys(content.state_delta).forEach(path => {
      applyPath(state, path, content.state_delta[path]);
    });
  }

  await updateRow(env.SHEET_ID, "sessions", sessionId, {
    state: JSON.stringify(state),
    history_summary: (session.history_summary || "") + ` | User: ${text}` + (content.dialogue ? ` | AI: ${content.dialogue.map(d => d.line).join(" ")}` : "")
  }, token);
  
  return content;
}

async function handleGetChatContext(env, data, token) {
  const { sessionId, text, vibe, intensity } = data;
  const context = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
  if (context.error) return context;
  const { scenario, session, messages } = context;

  const state = typeof session.state === 'string' ? JSON.parse(session.state || "{}") : (session.state || {});
  const systemPrompt = SYSTEM_INSTRUCTION_TEMPLATE
    .replace('{{scenario_config}}', JSON.stringify(scenario, null, 2))
    .replace('{{runtime_state}}', JSON.stringify(state, null, 2))
    .replace('{{history_summary}}', session.history_summary || 'None yet.');

  const history = messages.slice(-10).map(m => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: (m.sender === 'ai' && m.character_name ? `[${m.character_name}]: ${m.content}` : m.content) }]
  }));

  // Append current user message if provided
  if (text) {
    history.push({
      role: 'user',
      parts: [{ text: `[Detected Vibe: ${vibe || 'Neutral'}, Intensity: ${intensity || '0.5'}]\nUser: ${text}` }]
    });
  }

  return { systemPrompt, history, state, geminiApiKey: env.GEMINI_API_KEY };
}

async function handleProcessChatResult(env, data, token) {
  const { sessionId, aiResponse, state, userText } = data;
  const context = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
  if (context.error) return context;
  const { scenario, session } = context;

  let gameOver = false;
  let outcome = null;

  if (aiResponse.phase_event === 'advance_to_next_phase') {
    const phases = scenario.phase_rules?.phases || [];
    let currentIndex = phases.findIndex(p => String(p.id || p.name) === String(state.current_phase));

    if (currentIndex !== -1 && currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      state.current_phase = typeof nextPhase === 'object' ? (nextPhase.id || nextPhase.name) : nextPhase;
      state.phase_turn_count = 0;
    } else {
      gameOver = true;
      outcome = 'win';
    }
  } else if (aiResponse.phase_event === 'game_over_win') {
    gameOver = true;
    outcome = 'win';
  } else if (aiResponse.phase_event === 'game_over_fail') {
    gameOver = true;
    outcome = 'fail';
  }

  const sessionUpdateData = {
    state: JSON.stringify(state),
    status: gameOver ? 'completed' : 'ongoing',
    history_summary: (session.history_summary || "") + (userText ? ` | User: ${userText}` : "") + (aiResponse.dialogue ? ` | AI: ${aiResponse.dialogue.map(d => d.line).join(" ")}` : "")
  };

  if (gameOver) {
    sessionUpdateData.outcome_score = outcome === 'win' ? 100 : 0;
    sessionUpdateData.ended_at = new Date().toISOString();
  }

  await updateRow(env.SHEET_ID, "sessions", sessionId, sessionUpdateData, token);

  return { success: true, state, game_over: gameOver, outcome, narrator: aiResponse.narrator };
}

async function handleEndSession(env, data, token) {
  const { sessionId } = data;
  await updateRow(env.SHEET_ID, "sessions", sessionId, {
    status: 'completed',
    ended_at: new Date().toISOString()
  }, token);
  return { success: true };
}

async function handleSaveEvaluation(env, data, token) {
  const { sessionId, evaluation, lineAnalysis } = data;
  await updateRow(env.SHEET_ID, "sessions", sessionId, {
    ai_evaluation: JSON.stringify(evaluation),
    outcome_score: evaluation.overall_score * 10,
    history_summary: evaluation.history_summary
  }, token);

  if (lineAnalysis) {
    for (const line of lineAnalysis) {
      await createRow(env.SHEET_ID, "feedback_logs", {
        id: sessionId + '_' + line.message_id,
        session_id: sessionId,
        message_id: line.message_id,
        feedback_text: line.feedback_text,
        score: line.score,
        dimension: JSON.stringify(line.dimension),
        created_at: new Date().toISOString()
      }, token);
    }
  }
}

async function handleGenerateEvaluation(env, data) {
  const { transcript } = data;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  
  const systemPrompt = `
    You are an expert negotiation coach. Review this transcript and evaluate performance in THAI. 
    Return strictly JSON: 
    {
      "overall_score": 0-10, 
      "feedback_text": "...", 
      "history_summary": "...", 
      "key_strengths": [], 
      "areas_for_improvement": [], 
      "line_analysis": [
        {
          "message_id": "...", 
          "feedback_text": "...", 
          "score": 0-10, 
          "dimension": { "Logic": "คะแนน/คำอธิบาย", "Trust": "คะแนน/คำอธิบาย" }
        }
      ]
    }
    CRITICAL: "dimension" MUST be an object, not a string.
  `;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: transcript }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    })
  });
  const res = await response.json();
  return JSON.parse(res.candidates[0].content.parts[0].text);
}

async function handleGenerateWhatIf(env, data) {
  const { originalContent } = data;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const systemPrompt = `Analyze: "${originalContent}". Return JSON in THAI: {"feedback": {"text": "..."}}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: "What if?" }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  const res = await response.json();
  return JSON.parse(res.candidates[0].content.parts[0].text);
}

function applyPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  const lastPart = parts[parts.length - 1];
  if (typeof value === 'string' && (value.startsWith('+') || value.startsWith('-'))) {
    current[lastPart] = (parseInt(current[lastPart] || 0)) + parseInt(value);
  } else {
    current[lastPart] = value;
  }
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function errorResponse(msg, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
