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

# LAYER 1.5: Active Phase Requirements (สำคัญ — อ่านก่อนตอบทุกครั้ง)
{{current_phase_context}}

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
   - 'none': ดำเนินการเจรจาปกติ — ผู้เล่นยังไม่ทำตาม advance_condition ของ Phase ปัจจุบัน
   - 'advance_to_next_phase': เมื่อผู้ใช้ทำตาม advance_condition ของ Phase ปัจจุบันสำเร็จ (ดู LAYER 1.5)
   - 'game_over_win': เมื่อผู้ใช้ทำตาม win_condition หลักสำเร็จ และอยู่ใน Phase สุดท้ายแล้ว
   - 'game_over_fail': เมื่อการเจรจาล้มเหลวอย่างรุนแรง หรือละเมิด fail_conditions หรือเกิน turn_limit ของ phase
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
          const tables = ["users", "scenarios", "sessions", "messages", "feedback_logs", "skill_progress", "real_world_journals"];
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

        if (action === "setup") {
          const result = await handleSetupSheets(env.SHEET_ID, token);
          return jsonResponse(result);
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
  let headers = headData.values ? headData.values[0] : Object.keys(data);
  const missingHeaders = Object.keys(data).filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    headers = [...headers, ...missingHeaders];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:ZZ1?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [headers] })
    });
  }

  const newRow = headers.map(h => {
    let val = data[h] !== undefined && data[h] !== null ? data[h] : "";
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
  let headers = (await headResponse.json()).values[0];
  const missingHeaders = Object.keys(data).filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    headers = [...headers, ...missingHeaders];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:ZZ1?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [headers] })
    });
  }

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
 * --- PHASE HELPERS ---
 */

function getPhaseId(phase) {
  if (!phase) return null;
  return typeof phase === 'string' ? phase : (phase.id || phase.name || null);
}

function normalizePhase(phase, index) {
  if (typeof phase === 'string') {
    return {
      id: phase,
      name: phase,
      description: '',
      turn_limit: 5,
      advance_condition: '',
      ai_behavior: ''
    };
  }
  return {
    id: phase.id || `phase_${index + 1}`,
    name: phase.name || phase.id || `Phase ${index + 1}`,
    description: phase.description || '',
    turn_limit: phase.turn_limit ?? 5,
    advance_condition: phase.advance_condition || '',
    ai_behavior: phase.ai_behavior || ''
  };
}

function normalizePhaseRules(phaseRules) {
  const rules = phaseRules || {};
  const phases = Array.isArray(rules.phases) ? rules.phases.map(normalizePhase) : [];
  const failConditions = rules.fail_conditions
    || (rules.fail_condition ? [rules.fail_condition] : []);
  return {
    phases,
    win_condition: rules.win_condition || '',
    fail_conditions: failConditions
  };
}

function findPhaseIndex(phases, currentPhaseId) {
  if (!currentPhaseId) return -1;
  return phases.findIndex(p => String(getPhaseId(p)) === String(currentPhaseId));
}

function buildInitialState(scenario) {
  const phaseRules = normalizePhaseRules(scenario.phase_rules);
  const firstPhaseId = phaseRules.phases[0] ? getPhaseId(phaseRules.phases[0]) : 'opening';
  const defaults = {
    current_phase: firstPhaseId,
    phase_turn_count: 0,
    turn_total: 0,
    unlocked_characters: (scenario.characters || []).map(c => c.id).filter(Boolean),
    phase_flags: {},
    relationships: {},
    resolved_issues: [],
    pending_issues: [],
    agreements: {},
    score: 0
  };
  const custom = typeof scenario.initial_state === 'string'
    ? JSON.parse(scenario.initial_state || '{}')
    : (scenario.initial_state || {});
  return { ...defaults, ...custom, current_phase: custom.current_phase || defaults.current_phase };
}

function buildPhaseContextBlock(scenario, state) {
  const phaseRules = normalizePhaseRules(scenario.phase_rules);
  const phases = phaseRules.phases;
  const currentId = state.current_phase || (phases[0] ? getPhaseId(phases[0]) : null);
  const currentIndex = findPhaseIndex(phases, currentId);
  const currentPhase = currentIndex >= 0 ? phases[currentIndex] : null;
  const nextPhase = currentIndex >= 0 && currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;

  const lines = [
    `## Global Win Condition: ${phaseRules.win_condition || 'ไม่ได้กำหนด'}`,
    `## Global Fail Conditions: ${phaseRules.fail_conditions.length ? phaseRules.fail_conditions.join(' | ') : 'ไม่ได้กำหนด'}`,
    `## Current Phase ID: ${currentId || 'unknown'}`,
    `## Phase Turn: ${state.phase_turn_count ?? 0}${currentPhase?.turn_limit ? ` / limit ${currentPhase.turn_limit}` : ''}`,
    `## Total Turns: ${state.turn_total ?? 0}`,
  ];

  if (currentPhase) {
    lines.push(`### ชื่อเฟส: ${currentPhase.name}`);
    lines.push(`### คำอธิบายเฟส: ${currentPhase.description || 'ไม่ได้กำหนด'}`);
    lines.push(`### Advance Condition (ต้องทำสำเร็จเพื่อไปเฟสถัดไป): ${currentPhase.advance_condition || 'ไม่ได้กำหนด'}`);
    lines.push(`### AI Behavior ในเฟสนี้: ${currentPhase.ai_behavior || 'ไม่ได้กำหนด'}`);
  }

  if (nextPhase) {
    lines.push(`### Next Phase: ${getPhaseId(nextPhase)} (${nextPhase.name})`);
  } else if (phases.length > 0) {
    lines.push(`### Next Phase: NONE — เฟสสุดท้าย เมื่อสำเร็จ advance_condition ให้ใช้ game_over_win`);
  }

  if (scenario.opening_scene && (state.turn_total === 0 || state.turn_total === undefined)) {
    lines.push(`## Opening Scene: ${scenario.opening_scene}`);
  }

  if (scenario.player_role) {
    lines.push(`## Player Role: ${JSON.stringify(scenario.player_role)}`);
  }

  if (phases.length > 0) {
    lines.push(`## All Phases Overview:`);
    phases.forEach((p, i) => {
      const marker = getPhaseId(p) === currentId ? '→' : ' ';
      lines.push(`${marker} ${i + 1}. [${getPhaseId(p)}] ${p.name}: advance="${p.advance_condition || '-'}" turn_limit=${p.turn_limit}`);
    });
  }

  return lines.join('\n');
}

function buildSystemPrompt(scenario, state, historySummary) {
  const scenarioForPrompt = {
    title: scenario.title,
    description: scenario.description,
    target_group: scenario.target_group,
    player_role: scenario.player_role,
    characters: scenario.characters,
    phase_rules: normalizePhaseRules(scenario.phase_rules),
    opening_scene: scenario.opening_scene
  };

  return SYSTEM_INSTRUCTION_TEMPLATE
    .replace('{{scenario_config}}', JSON.stringify(scenarioForPrompt, null, 2))
    .replace('{{current_phase_context}}', buildPhaseContextBlock(scenario, state))
    .replace('{{runtime_state}}', JSON.stringify(state, null, 2))
    .replace('{{history_summary}}', historySummary || 'None yet.');
}

function ensureSessionState(scenario, session) {
  let state = typeof session.state === 'string' ? JSON.parse(session.state || '{}') : (session.state || {});
  if (!state.current_phase) {
    state = buildInitialState(scenario);
  }
  return state;
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
  const state = ensureSessionState(scenario, session);
  const systemPrompt = buildSystemPrompt(scenario, state, session.history_summary);

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
  const { sessionId, text, vibe, intensity, voiceComment } = data;
  const context = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
  if (context.error) return context;
  const { scenario, session, messages } = context;

  const state = ensureSessionState(scenario, session);
  const systemPrompt = buildSystemPrompt(scenario, state, session.history_summary);

  const history = messages.slice(-10).map(m => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: (m.sender === 'ai' && m.character_name ? `[${m.character_name}]: ${m.content}` : m.content) }]
  }));

  // Append current user message if provided
  if (text) {
    const voiceNote = voiceComment ? `\nDetailed voice coach note: ${voiceComment}` : "";
    history.push({
      role: 'user',
      parts: [{ text: `[Detected Vibe: ${vibe || 'Neutral'}, Intensity: ${intensity || '0.5'}${voiceNote}]\nUser: ${text}` }]
    });
  }

  return { systemPrompt, history, state, geminiApiKey: env.GEMINI_API_KEY };
}

async function handleProcessChatResult(env, data, token) {
  const { sessionId, aiResponse, state, userText, voiceVibe, voiceIntensity, voiceComment } = data;
  const context = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
  if (context.error) return context;
  const { scenario, session } = context;

  let gameOver = false;
  let outcome = null;

  if (userText && !String(userText).startsWith('[System:')) {
    state.phase_turn_count = (state.phase_turn_count || 0) + 1;
    state.turn_total = (state.turn_total || 0) + 1;
  }

  if (aiResponse.state_delta) {
    Object.keys(aiResponse.state_delta).forEach(path => {
      applyPath(state, path, aiResponse.state_delta[path]);
    });
  }

  if (aiResponse.phase_event === 'advance_to_next_phase') {
    const phases = normalizePhaseRules(scenario.phase_rules).phases;
    const currentIndex = findPhaseIndex(phases, state.current_phase);

    if (currentIndex !== -1 && currentIndex < phases.length - 1) {
      state.current_phase = getPhaseId(phases[currentIndex + 1]);
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
    history_summary: (session.history_summary || "") + (userText ? ` | User: ${userText}` : "") + (voiceComment ? ` [Voice: ${voiceVibe || 'Unknown'}, intensity ${voiceIntensity || 'N/A'}, ${voiceComment}]` : "") + (aiResponse.dialogue ? ` | AI: ${aiResponse.dialogue.map(d => d.line).join(" ")}` : "")
  };

  if (gameOver) {
    sessionUpdateData.outcome_score = outcome === 'win' ? 100 : 0;
    sessionUpdateData.ended_at = new Date().toISOString();
  }

  await updateRow(env.SHEET_ID, "sessions", sessionId, sessionUpdateData, token);

  return { success: true, state, game_over: gameOver, outcome, narrator: aiResponse.narrator };
}

function computeOutcomeScoreFromState(state) {
  if (!state || typeof state !== 'object') return 50;
  if (typeof state.score === 'number' && state.score > 0) {
    return Math.min(100, Math.max(0, Math.round(state.score)));
  }
  const rels = Object.values(state.relationships || {});
  if (rels.length === 0) return 50;
  const avgTrust = rels.reduce((s, r) => s + (Number(r.trust) || 5), 0) / rels.length;
  const avgAnger = rels.reduce((s, r) => s + (Number(r.anger) || 5), 0) / rels.length;
  const agreements = Object.keys(state.agreements || {}).length;
  const resolved = (state.resolved_issues || []).length;
  const progress = Math.min(40, agreements * 15 + resolved * 10);
  const relScore = avgTrust * 8 - avgAnger * 4;
  return Math.min(100, Math.max(25, Math.round(30 + relScore + progress)));
}

async function handleEndSession(env, data, token) {
  const { sessionId } = data;
  const context = await handleGetNegotiationData(env.SHEET_ID, sessionId, token);
  if (context.error) return context;

  let state = {};
  try {
    const raw = context.session?.state;
    state = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
  } catch {
    state = {};
  }

  const existing = Number(context.session?.outcome_score);
  const outcomeScore = Number.isFinite(existing) && existing > 0
    ? existing
    : computeOutcomeScoreFromState(state);

  await updateRow(env.SHEET_ID, "sessions", sessionId, {
    status: 'completed',
    ended_at: new Date().toISOString(),
    outcome_score: outcomeScore
  }, token);
  return { success: true, outcome_score: outcomeScore };
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
    If a user line includes microphone voice metadata, use it in both the overall coaching and that line's feedback_text. Comment on tone of voice, intensity, pace/pauses, confidence, politeness, and how the delivery affected negotiation outcomes.
    The skills_assessment object must use the same five keys as the Skill Radar: opening_conversation, handling_pushback, finding_common_ground, empathy_expression, logical_argument.
    Return strictly JSON: 
    {
      "overall_score": 0-10, 
      "feedback_text": "...", 
      "history_summary": "...", 
      "skills_assessment": {
        "opening_conversation": 0-10,
        "handling_pushback": 0-10,
        "finding_common_ground": 0-10,
        "empathy_expression": 0-10,
        "logical_argument": 0-10
      },
      "aar": {
        "what_went_well": "อะไรทำได้ดี...",
        "what_made_it_worse": "ประโยคไหนทำให้แย่ลง...",
        "how_to_improve": "ครั้งหน้าควรปรับกลยุทธ์อย่างไร..."
      },
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

async function handleSetupSheets(sheetId, token) {
  const schema = {
    "users": ["id", "email", "created_at", "streak_count", "last_active_date"],
    "scenarios": ["id", "title", "description", "preview_img", "target_group", "player_role", "characters", "phase_rules", "initial_state", "opening_scene", "mode", "difficulty"],
    "sessions": ["id", "user_id", "scenario_id", "started_at", "ended_at", "outcome_score", "status", "state", "history_summary", "ai_evaluation", "mode", "stage"],
    "messages": ["id", "session_id", "sender", "character_name", "content", "created_at", "input_mode", "voice_vibe", "voice_intensity", "voice_comment"],
    "feedback_logs": ["id", "session_id", "message_id", "feedback_text", "score", "dimension", "created_at"],
    "skill_progress": ["id", "user_id", "skill_name", "level", "xp", "updated_at"],
    "real_world_journals": ["id", "user_id", "title", "situation_description", "outcome", "success_rate", "skills_applied", "created_at"]
  };

  const spreadsheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const spreadsheet = await spreadsheetResponse.json();
  if (spreadsheet.error) return { success: false, error: spreadsheet.error.message };

  const existingSheets = spreadsheet.sheets.map(s => s.properties.title);
  const details = [];
  
  const addSheetRequests = [];
  for (const tableName of Object.keys(schema)) {
    if (!existingSheets.includes(tableName)) {
      addSheetRequests.push({
        addSheet: { properties: { title: tableName } }
      });
      details.push(`Created sheet: ${tableName}`);
    }
  }

  if (addSheetRequests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: addSheetRequests })
    });
  }

  for (const tableName of Object.keys(schema)) {
    const requiredHeaders = schema[tableName];
    
    let currentHeaders = [];
    try {
      const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:Z1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.values && data.values.length > 0) {
        currentHeaders = data.values[0];
      }
    } catch(e) {}

    const newHeaders = [...currentHeaders];
    let changed = false;

    for (const h of requiredHeaders) {
      if (!newHeaders.includes(h)) {
        newHeaders.push(h);
        changed = true;
      }
    }

    if (changed) {
      // Use PUT to overwrite row 1 with the merged headers
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tableName}!A1:ZZ1?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [newHeaders] })
      });
      details.push(currentHeaders.length === 0 ? `Set headers for: ${tableName}` : `Added missing headers to: ${tableName}`);
    }
  }

  if (details.length === 0) details.push("All sheets and headers are already up to date.");

  return { success: true, details };
}
