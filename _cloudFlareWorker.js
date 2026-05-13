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

        if (action === "chat") {
          const result = await handleChatAction(env, payload, token);
          return jsonResponse(result);
        }

        if (action === "end_session") {
          const result = await updateRow(env.SHEET_ID, "sessions", payload.data.sessionId, { 
            status: 'completed', 
            ended_at: new Date().toISOString() 
          }, token);
          return jsonResponse(result);
        }

        if (action === "save_evaluation") {
          const result = await createRow(env.SHEET_ID, "feedback_logs", payload.data, token);
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
  // We use a simplified JWT approach for Workers
  // In a real environment, you'd use 'google-auth-library' but that requires bundling.
  // This helper assumes you've set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in secrets.
  
  const clientEmail = env.GOOGLE_CLIENT_EMAIL;
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/generative-language";
  
  // Minimal JWT implementation for Cloudflare Workers
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
  // Extract only the base64 part, ignoring header, footer, and any whitespace
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
    throw new Error("Base64 Key Error: " + e.message + " (Check your GOOGLE_PRIVATE_KEY secret)");
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
    if (data.error) {
      console.error(`Sheets API Error for ${tableName}:`, data.error.message);
      return [];
    }
    if (!data.values) return [];

    const headers = data.values[0];
    const rows = data.values.slice(1);

    return rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch (e) {}
        }
        obj[h] = val;
      });
      return obj;
    });
  } catch (err) {
    console.error(`Fetch Error for ${tableName}:`, err.message);
    return [];
  }
}

async function createRow(sheetId, tableName, data, token) {
  // First, get headers to ensure alignment
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
  // 1. Find the row index
  const tableData = await readTable(sheetId, tableName, token);
  const rowIndex = tableData.findIndex(r => r.id == id);
  if (rowIndex === -1) throw new Error("ID not found: " + id);

  // 2. Get headers
  const headResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:Z1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const headers = (await headResponse.json()).values[0];

  // 3. Prepare updated row
  const currentRow = tableData[rowIndex];
  const updatedRow = headers.map(h => {
    let val = data[h] !== undefined ? data[h] : currentRow[h];
    return typeof val === 'object' ? JSON.stringify(val) : val;
  });

  // 4. Update (Row is 1-indexed, headers are row 1, so row 2 is index 0)
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
  const existing = tableData.find(r => r[queryField] == queryValue);
  
  if (existing) {
    return await updateRow(sheetId, tableName, existing.id, data, token);
  } else {
    return await createRow(sheetId, tableName, data, token);
  }
}

async function handleGetNegotiationData(sheetId, sessionId, token) {
  const sessions = await readTable(sheetId, "sessions", token);
  const session = sessions.find(s => s.id == sessionId);
  if (!session) return { error: "Session not found" };

  const scenarios = await readTable(sheetId, "scenarios", token);
  const scenario = scenarios.find(s => s.id == session.scenario_id);

  const allMessages = await readTable(sheetId, "messages", token);
  const messages = allMessages.filter(m => m.session_id == sessionId);

  return { session, scenario, messages };
}

/**
 * --- GEMINI CHAT LOGIC ---
 */

async function handleChatAction(env, data, token) {
  const { sessionId, text, vibe, intensity } = data;
  
  // 1. Get Context
  const context = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
  const { scenario, session, messages } = context;

  // 2. Call Gemini
  const geminiApiKey = env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const state = JSON.parse(session.state || "{}");
  
  // Build Prompt
  const systemPrompt = SYSTEM_INSTRUCTION_TEMPLATE
    .replace('{{scenario_config}}', JSON.stringify(scenario, null, 2))
    .replace('{{runtime_state}}', JSON.stringify(state, null, 2))
    .replace('{{history_summary}}', session.history_summary || 'None yet.');

  const contents = messages.slice(-10).map(m => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: (m.sender === 'ai' && m.character_name ? `[${m.character_name}]: ${m.content}` : m.content) }]
  }));

  // Add current input
  contents.push({
    role: 'user',
    parts: [{ text: `[Detected Vibe: ${vibe || 'Neutral'}, Intensity: ${intensity || '0.5'}]\nUser: ${text}` }]
  });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const aiResult = await response.json();
  const rawResponseText = aiResult.candidates[0].content.parts[0].text;
  const content = JSON.parse(rawResponseText);

  // 3. Save AI Message
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

  // 4. Update Session State & Phase Logic
  if (content.state_delta) {
    Object.keys(content.state_delta).forEach(path => {
      applyPath(state, path, content.state_delta[path]);
    });
  }

  let gameOver = false;
  let outcome = null;
  let sessionStatus = session.status || 'active';

  if (content.phase_event === 'advance_to_next_phase') {
    const phases = scenario.phase_rules?.phases || [];
    let currentIndex = -1;
    if (phases.length > 0 && typeof phases[0] === 'object') {
      currentIndex = phases.findIndex(p => p.id === state.current_phase || p.name === state.current_phase);
    } else {
      currentIndex = phases.indexOf(state.current_phase);
    }

    if (currentIndex !== -1 && currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      state.current_phase = typeof nextPhase === 'object' ? (nextPhase.id || nextPhase.name) : nextPhase;
      state.phase_turn_count = 0;
    } else {
      gameOver = true;
      outcome = 'win';
    }
  } else if (content.phase_event === 'game_over_win') {
    gameOver = true;
    outcome = 'win';
  } else if (content.phase_event === 'game_over_fail') {
    gameOver = true;
    outcome = 'fail';
  }

  const sessionUpdateData = {
    state: JSON.stringify(state),
    history_summary: (session.history_summary || "") + ` | User: ${text}`
  };

  if (gameOver) {
    sessionUpdateData.status = 'completed';
    sessionUpdateData.outcome_score = outcome === 'win' ? 100 : 0; // Simplified scoring
    sessionUpdateData.ended_at = new Date().toISOString();
  }

  await updateRow(env.SHEET_ID, "sessions", sessionId, sessionUpdateData, token);
  
  return content;
}

/**
 * Helper to update nested objects via path string (e.g., "relationships.char_1.trust")
 */
function applyPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  
  const lastPart = parts[parts.length - 1];
  if (typeof value === 'string' && (value.startsWith('+') || value.startsWith('-'))) {
    const num = parseInt(value);
    current[lastPart] = (current[lastPart] || 0) + num;
  } else {
    current[lastPart] = value;
  }
}

/**
 * --- UTILS ---
 */

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" 
    },
  });
}

function errorResponse(msg, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" 
    },
  });
}
