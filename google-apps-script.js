const props = PropertiesService.getScriptProperties();
const SHEET_ID = props.getProperty('SHEET_ID');
const SECRET_KEY = props.getProperty('SECRET_KEY');

// Google Auth Config (Stored here for accessibility via API if needed)
const GOOGLE_CONFIG = {
  clientId: props.getProperty('GOOGLE_CLIENT_ID'),
  clientSecret: props.getProperty('GOOGLE_CLIENT_SECRET')
};

/**
 * Handle GET requests
 * Usage: ?action=read&table=tableName&key=SECRET_KEY
 */
function doGet(e) {
  try {
    authenticate(e);
    const action = e.parameter.action;
    const table = e.parameter.table;

    if (action === 'read') {
      const data = readTable(table);
      return jsonResponse(data);
    }
    
    if (action === 'read_all') {
      const data = readAllTables();
      return jsonResponse(data);
    }

    if (action === 'setup') {
      const result = setupDatabase();
      return jsonResponse(result);
    }
    
    if (action === 'get_config') {
      return jsonResponse({ google_client_id: GOOGLE_CONFIG.clientId });
    }

    return errorResponse('Invalid action');
  } catch (err) {
    return errorResponse(err.message);
  }
}

/**
 * Handle POST requests
 * Usage: Body: { action: 'create', table: 'messages', data: {...}, key: 'SECRET_KEY' }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    authenticate({ parameter: { key: payload.key } });

    const action = payload.action;
    const table = payload.table;
    const data = payload.data;

    if (action === 'create') {
      const result = createRow(table, data);
      return jsonResponse(result);
    }

    if (action === 'update') {
      const result = updateRow(table, payload.id, data);
      return jsonResponse(result);
    }

    if (action === 'upsert') {
      const result = upsertRow(table, payload.queryField, payload.queryValue, data);
      return jsonResponse(result);
    }

    if (action === 'chat') {
      const result = handleChatAction(data);
      return jsonResponse(result);
    }

    if (action === 'end_session') {
      const result = handleEndSession(data.sessionId);
      return jsonResponse(result);
    }

    return errorResponse('Invalid action');
  } catch (err) {
    return errorResponse(err.message);
  }
}

/**
 * CORE CRUD FUNCTIONS
 */

let cachedSS = null;
function getSpreadsheet() {
  if (!cachedSS) {
    cachedSS = SpreadsheetApp.openById(SHEET_ID);
  }
  return cachedSS;
}

function readTable(tableName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error('Table ' + tableName + ' not found');

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      let val = row[i];
      // Try to parse JSON if it looks like a JSON string
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      obj[header] = val;
    });
    return obj;
  });
}

function readRowById(tableName, id) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) throw new Error('Table ' + tableName + ' not found');

  const finder = sheet.createTextFinder(id.toString()).matchEntireCell(true).findAll();
  if (finder.length === 0) return null;

  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idIndex = headers.indexOf('id');

  let targetRow = -1;
  for (const cell of finder) {
    if (cell.getColumn() === idIndex + 1) {
      targetRow = cell.getRow();
      break;
    }
  }

  if (targetRow === -1) return null;

  const rowData = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  const obj = {};
  headers.forEach((header, i) => {
    let val = rowData[i];
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try { val = JSON.parse(val); } catch (e) {}
    }
    obj[header] = val;
  });
  return obj;
}

function readMessagesBySessionId(sessionId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('messages');
  if (!sheet) return [];

  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const sessionIdIndex = headers.indexOf('session_id');

  const finder = sheet.createTextFinder(sessionId.toString()).matchEntireCell(true).findAll();
  if (finder.length === 0) return [];

  const rowIndices = finder
    .filter(cell => cell.getColumn() === sessionIdIndex + 1)
    .map(cell => cell.getRow())
    .sort((a, b) => a - b);

  if (rowIndices.length === 0) return [];

  const minRow = rowIndices[0];
  const maxRow = rowIndices[rowIndices.length - 1];
  
  const blockValues = sheet.getRange(minRow, 1, maxRow - minRow + 1, headers.length).getValues();
  
  const results = [];
  rowIndices.forEach(r => {
    const rowData = blockValues[r - minRow];
    const obj = {};
    headers.forEach((header, i) => {
      let val = rowData[i];
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      obj[header] = val;
    });
    results.push(obj);
  });
  
  return results;
}

function readAllTables() {
  const ss = getSpreadsheet();
  const sheets = ss.getSheets();
  const result = {};

  sheets.forEach(sheet => {
    const tableName = sheet.getName();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      result[tableName] = [];
      return;
    }

    const headers = values[0];
    const rows = values.slice(1);

    result[tableName] = rows.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        let val = row[i];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch (e) {}
        }
        obj[header] = val;
      });
      return obj;
    });
  });

  return result;
}

function createRow(tableName, data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
    const headers = Object.keys(data);
    sheet.appendRow(headers);
  }

  const headers = sheet.getDataRange().getValues()[0];
  const newRow = headers.map(h => {
    let val = data[h] || '';
    if (typeof val === 'object') val = JSON.stringify(val);
    return val;
  });

  sheet.appendRow(newRow);
  return { success: true, data: data };
}

function createRows(tableName, dataArray) {
  if (!dataArray || dataArray.length === 0) return { success: true, count: 0 };
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
    const headers = Object.keys(dataArray[0]);
    sheet.appendRow(headers);
  }

  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  const newRows = dataArray.map(data => {
    return headers.map(h => {
      let val = data[h] || '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return val;
    });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  return { success: true, count: newRows.length };
}

function updateRow(tableName, id, data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  
  const finder = sheet.createTextFinder(id.toString()).matchEntireCell(true).findAll();
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idIndex = headers.indexOf('id');

  let targetRow = -1;
  for (const cell of finder) {
    if (cell.getColumn() === idIndex + 1) {
      targetRow = cell.getRow();
      break;
    }
  }

  if (targetRow !== -1) {
    headers.forEach((h, j) => {
      if (data[h] !== undefined) {
        let val = data[h];
        if (typeof val === 'object') val = JSON.stringify(val);
        sheet.getRange(targetRow, j + 1).setValue(val);
      }
    });
    return { success: true };
  }
  
  throw new Error('ID not found');
}

function upsertRow(tableName, queryField, queryValue, data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  
  const finder = sheet.createTextFinder(queryValue.toString()).matchEntireCell(true).findAll();
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const fieldIndex = headers.indexOf(queryField);

  let targetRow = -1;
  for (const cell of finder) {
    if (cell.getColumn() === fieldIndex + 1) {
      targetRow = cell.getRow();
      break;
    }
  }

  if (targetRow !== -1) {
    // Found existing, get its ID and update
    const existingId = sheet.getRange(targetRow, headers.indexOf('id') + 1).getValue();
    return updateRow(tableName, existingId, data);
  }
  
  return createRow(tableName, data);
}

/**
 * UTILS
 */

function authenticate(e) {
  const key = e.parameter.key || (e.postData && JSON.parse(e.postData.contents).key);
  if (!SECRET_KEY || key !== SECRET_KEY) {
    throw new Error('Unauthorized');
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}

function errorResponse(msg) {
  return jsonResponse({ error: msg });
}

/**
 * SETUP FUNCTION
 * Creates all necessary sheets and headers
 */
function setupDatabase() {
  const ss = getSpreadsheet();
  const tables = {
    'users': ['id', 'email', 'created_at', 'streak_count', 'last_active_date'],
    'scenarios': ['id', 'title', 'description', 'target_group', 'player_role', 'characters', 'phase_rules', 'initial_state', 'opening_scene'],
    'sessions': ['id', 'user_id', 'scenario_id', 'started_at', 'ended_at', 'outcome_score', 'status', 'state', 'history_summary'],
    'messages': ['id', 'session_id', 'sender', 'character_name', 'content', 'created_at'],
    'feedback_logs': ['id', 'session_id', 'message_id', 'feedback_text', 'score', 'dimension', 'created_at'],
    'skill_progress': ['id', 'user_id', 'skill_name', 'level', 'xp', 'updated_at']
  };

  const results = [];

  for (const tableName in tables) {
    let sheet = ss.getSheetByName(tableName);
    const targetHeaders = tables[tableName];

    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      sheet.appendRow(targetHeaders);
      results.push(`Created table: ${tableName}`);
    } else {
      const lastCol = Math.max(1, sheet.getLastColumn());
      const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      // 1. Add missing headers
      targetHeaders.forEach(h => {
        if (!existingHeaders.includes(h)) {
          const newColPos = sheet.getLastColumn() + 1;
          sheet.getRange(1, newColPos).setValue(h);
          results.push(`Added [${h}] to ${tableName}`);
        }
      });

      // 2. Remove extra headers (not in definition)
      // Re-fetch existing headers to get updated positions
      const updatedLastCol = sheet.getLastColumn();
      const updatedHeaders = sheet.getRange(1, 1, 1, updatedLastCol).getValues()[0];
      
      for (let i = updatedHeaders.length - 1; i >= 0; i--) {
        const h = updatedHeaders[i];
        if (h && !targetHeaders.includes(h)) {
          sheet.deleteColumn(i + 1);
          results.push(`Removed extra column [${h}] from ${tableName}`);
        }
      }
      
      if (results.filter(r => r.includes(tableName)).length === 0) {
        results.push(`Table ${tableName} is already up to date`);
      }
    }
  }

  return { success: true, details: results };
}

/**
 * LLM INTERACTION (Antigravity Agent)
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

/**
 * Call Gemini API with 4-layer state injection
 */
function getAntigravityResponse(payload) {
  const apiKey = props.getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not found');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const scenarioConfig = JSON.stringify(payload.scenario, null, 2);
  const runtimeState = JSON.stringify(payload.state, null, 2);
  const messages = payload.messages || [];

  const systemPrompt = SYSTEM_INSTRUCTION_TEMPLATE
    .replace('{{scenario_config}}', scenarioConfig)
    .replace('{{runtime_state}}', runtimeState)
    .replace('{{history_summary}}', payload.history_summary || 'None yet.');

  // Convert messages to Gemini format
  const contents = messages.map(m => {
    // Prefix character name to model responses to maintain identity in history
    const textContext = (m.sender === 'ai' || m.sender === 'model') && m.character_name 
      ? `[${m.character_name}]: ${m.content}` 
      : m.content;
      
    return {
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: textContext }]
    };
  });

  // Ensure first message is user
  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({ role: 'user', parts: [{ text: '(Conversation started)' }] });
  }

  // Add the final user message with vibe context
  const latestUserInput = `[Detected Vibe: ${payload.vibe || 'Neutral'}, Intensity: ${payload.intensity || '0.5'}]\nUser: ${payload.text}`;
  contents.push({ role: 'user', parts: [{ text: latestUserInput }] });

  // Merge consecutive messages with the same role (Gemini requirement)
  const mergedContents = [];
  for (const msg of contents) {
    if (mergedContents.length > 0 && mergedContents[mergedContents.length - 1].role === msg.role) {
      mergedContents[mergedContents.length - 1].parts[0].text += `\n\n${msg.parts[0].text}`;
    } else {
      mergedContents.push(msg);
    }
  }

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: mergedContents,
    generationConfig: {
      temperature: 0.7, // Higher temperature for more natural/human-like responses
      response_mime_type: "application/json"
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body)
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  const responseText = json.candidates[0].content.parts[0].text;

  try {
    return JSON.parse(responseText);
  } catch (e) {
    // Fallback if AI didn't return valid JSON
    return { dialogue: [{ char: 'system', line: responseText }], state_delta: {} };
  }
}

/**
 * Core Chat Logic with Phase Guard
 */
function handleChatAction(data) {
  const sessionId = data.sessionId;
  const userText = data.text;
  
  // 1. Load Session & Scenario using fast TextFinder lookups
  const sessionRow = readRowById('sessions', sessionId);
  if (!sessionRow) throw new Error('Session not found');
  
  const scenario = readRowById('scenarios', sessionRow.scenario_id);
  if (!scenario) throw new Error('Scenario not found');

  // 2. Initialize State if needed
  let state = sessionRow.state;
  if (!state || typeof state !== 'object') {
    if (scenario.initial_state) {
      // Use advanced initial state if provided by the JSON
      state = JSON.parse(JSON.stringify(scenario.initial_state));
    } else {
      // Fallback to basic state initialization
      const firstPhase = scenario.phase_rules?.phases?.[0];
      state = {
        current_phase: typeof firstPhase === 'object' ? firstPhase.id : (firstPhase || 'opening'),
        phase_turn_count: 0,
        turn_total: 0,
        unlocked_characters: [scenario.characters?.[0]?.id || 'char_1'],
        phase_flags: {},
        relationships: {},
        resolved_issues: [],
        pending_issues: [],
        agreements: {},
        score: 50
      };
      // Initialize character relationships
      scenario.characters.forEach(c => {
        state.relationships[c.id || c.name] = { trust: 5, anger: 0, concessions_made: [] };
      });
    }
  }

  // 3. Phase Guard
  const winCondition = scenario.phase_rules?.win_condition;
  const failCondition = scenario.phase_rules?.fail_condition; // e.g. "turn > 20"
  
  state.phase_turn_count++;
  state.turn_total = (state.turn_total || 0) + 1;
  
  let currentTurnLimit = 20; // Default
  const phases = scenario.phase_rules?.phases || [];
  if (phases.length > 0 && typeof phases[0] === 'object') {
    const currentPhaseObj = phases.find(p => p.id === state.current_phase || p.name === state.current_phase);
    if (currentPhaseObj && currentPhaseObj.turn_limit) {
      currentTurnLimit = currentPhaseObj.turn_limit;
    }
  }

  if (state.phase_turn_count > currentTurnLimit) {
    return { 
      game_over: true, 
      outcome: 'fail', 
      narrator: `หมดเวลาในเฟส ${state.current_phase} แล้ว การเจรจาล้มเหลว` 
    };
  }

  // 4. Get History using fast TextFinder lookup
  const messages = readMessagesBySessionId(sessionId);
  
  // 5. Call LLM
  const aiResponse = getAntigravityResponse({
    scenario: scenario,
    state: state,
    history_summary: sessionRow.history_summary,
    messages: messages.slice(-10), // Send last 10 for context
    text: userText,
    vibe: data.vibe,
    intensity: data.intensity
  });

  // 6. Apply State Delta
  if (aiResponse.state_delta) {
    Object.keys(aiResponse.state_delta).forEach(path => {
      const value = aiResponse.state_delta[path];
      applyPath(state, path, value);
    });
  }

  let gameOver = false;
  let outcome = null;

  if (aiResponse.phase_event === 'advance_to_next_phase') {
    const phases = scenario.phase_rules?.phases || [];
    let currentIndex = -1;
    
    // Support both string array and object array for phases
    if (phases.length > 0 && typeof phases[0] === 'object') {
      currentIndex = phases.findIndex(p => p.id === state.current_phase || p.name === state.current_phase);
    } else {
      currentIndex = phases.indexOf(state.current_phase);
    }

    if (currentIndex !== -1 && currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      state.current_phase = typeof nextPhase === 'object' ? (nextPhase.id || nextPhase.name) : nextPhase;
      state.phase_turn_count = 0; // Reset turn count for new phase
    } else {
      // No more phases, so player wins
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

  // 7. Rolling Summary Logic (Simplified)
  let historySummary = sessionRow.history_summary || '';
  if (messages.length > 15 && messages.length % 5 === 0) {
    historySummary += ` | Turn ${messages.length}: User said "${userText}"`;
  }

  // 8. Save State
  const sessionUpdateData = {
    state: JSON.stringify(state),
    history_summary: historySummary
  };
  
  if (gameOver) {
    sessionUpdateData.status = 'completed';
    sessionUpdateData.outcome_score = outcome === 'win' ? calculateScore(state, scenario) : Math.floor(calculateScore(state, scenario) / 2);
    sessionUpdateData.ended_at = new Date().toISOString();
  }

  upsertRow('sessions', 'id', sessionId, sessionUpdateData);

  // 9. Save Messages (Batch Insert for Performance)
  if (aiResponse.dialogue && aiResponse.dialogue.length > 0) {
    const messagesData = aiResponse.dialogue.map(line => ({
      id: uuid(),
      session_id: sessionId,
      sender: 'ai',
      character_name: line.char,
      content: line.line,
      created_at: new Date().toISOString()
    }));
    createRows('messages', messagesData);
  }

  // 10. Return with updated state
  return {
    ...aiResponse,
    state: state,
    game_over: gameOver,
    outcome: outcome
  };
}

/**
 * Handle manual End Session
 */
function handleEndSession(sessionId) {
  const sessionRow = readRowById('sessions', sessionId);
  if (!sessionRow) throw new Error('Session not found');
  
  const scenario = readRowById('scenarios', sessionRow.scenario_id);
  if (!scenario) throw new Error('Scenario not found');

  let state = sessionRow.state;
  if (typeof state === 'string') state = JSON.parse(state);

  const finalScore = calculateScore(state, scenario);

  const sessionUpdateData = {
    status: 'completed',
    outcome_score: finalScore,
    ended_at: new Date().toISOString()
  };

  upsertRow('sessions', 'id', sessionId, sessionUpdateData);
  return { success: true, score: finalScore };
}

/**
 * Advanced Score Calculation Engine
 */
function calculateScore(state, scenario) {
  let score = 0;
  
  // 1. Phase Progression (40 points max)
  const phases = scenario.phase_rules?.phases || [];
  let currentPhaseIndex = 0;
  if (phases.length > 0 && typeof phases[0] === 'object') {
    currentPhaseIndex = phases.findIndex(p => p.id === state.current_phase || p.name === state.current_phase);
  } else {
    currentPhaseIndex = phases.indexOf(state.current_phase);
  }
  if (currentPhaseIndex === -1) currentPhaseIndex = 0;
  
  const phaseProgress = (currentPhaseIndex / Math.max(1, phases.length - 1)) * 40;
  score += phaseProgress;

  // 2. Trust and Anger Dynamics (40 points max)
  let relationshipScore = 0;
  const rels = state.relationships || {};
  const charIds = Object.keys(rels);
  if (charIds.length > 0) {
    let totalTrust = 0;
    let totalAnger = 0;
    charIds.forEach(id => {
      // Normalize trust to 0-10
      totalTrust += Math.min(10, Math.max(0, parseInt(rels[id].trust || 5, 10)));
      // Normalize anger to 0-10
      totalAnger += Math.min(10, Math.max(0, parseInt(rels[id].anger || 0, 10)));
    });
    
    // Trust contributes up to 20 points
    const avgTrust = totalTrust / charIds.length;
    relationshipScore += (avgTrust / 10) * 20;
    
    // Anger contributes up to 20 points (less anger = more points)
    const avgAnger = totalAnger / charIds.length;
    relationshipScore += ((10 - avgAnger) / 10) * 20;
  } else {
    relationshipScore = 20; // Default if no characters
  }
  score += relationshipScore;

  // 3. Resolved Issues Bonus (20 points max)
  const resolvedCount = (state.resolved_issues || []).length;
  // Assume 3 resolved issues gives max score for this category
  const resolvedScore = Math.min(20, (resolvedCount / 3) * 20);
  score += Math.max(0, resolvedScore);

  // 4. Efficiency Penalty
  // Subtract 2 points for every turn after 15 turns
  const totalTurns = parseInt(state.turn_total || 0, 10);
  const turnPenalty = Math.max(0, totalTurns - 15) * 2;
  score -= turnPenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Helper to update nested object properties using string path (e.g. "relationships.char_A.trust")
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
    const delta = parseInt(value, 10);
    current[lastPart] = parseInt(current[lastPart] || 0, 10) + delta;
  } else {
    current[lastPart] = value;
  }
}

function uuid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
