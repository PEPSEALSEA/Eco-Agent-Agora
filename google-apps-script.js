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

    return errorResponse('Invalid action');
  } catch (err) {
    return errorResponse(err.message);
  }
}

/**
 * CORE CRUD FUNCTIONS
 */

function readTable(tableName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
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

function readAllTables() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
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
  const ss = SpreadsheetApp.openById(SHEET_ID);
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

function updateRow(tableName, id, data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(tableName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('id');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] == id) {
      headers.forEach((h, j) => {
        if (data[h] !== undefined) {
          let val = data[h];
          if (typeof val === 'object') val = JSON.stringify(val);
          sheet.getRange(i + 1, j + 1).setValue(val);
        }
      });
      return { success: true };
    }
  }
  throw new Error('ID not found');
}

function upsertRow(tableName, queryField, queryValue, data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(tableName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const fieldIndex = headers.indexOf(queryField);

  for (let i = 1; i < values.length; i++) {
    if (values[i][fieldIndex] == queryValue) {
      return updateRow(tableName, values[i][headers.indexOf('id')], data);
    }
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
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tables = {
    'users': ['id', 'email', 'created_at', 'streak_count', 'last_active_date'],
    'scenarios': ['id', 'title', 'description', 'target_group', 'characters'],
    'sessions': ['id', 'user_id', 'scenario_id', 'started_at', 'ended_at', 'outcome_score', 'status'],
    'messages': ['id', 'session_id', 'sender', 'character_name', 'content', 'created_at'],
    'feedback_logs': ['id', 'session_id', 'message_id', 'feedback_text', 'score', 'dimension', 'created_at'],
    'skill_progress': ['id', 'user_id', 'skill_name', 'level', 'xp', 'updated_at']
  };

  const results = [];

  for (const tableName in tables) {
    let sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      sheet.appendRow(tables[tableName]);
      results.push(`Created table: ${tableName}`);
    } else {
      // Ensure headers are present
      const headers = sheet.getRange(1, 1, 1, tables[tableName].length).getValues()[0];
      if (headers[0] === "") {
        sheet.getRange(1, 1, 1, tables[tableName].length).setValues([tables[tableName]]);
        results.push(`Added headers to existing table: ${tableName}`);
      } else {
        results.push(`Table already exists: ${tableName}`);
      }
    }
  }

  return { success: true, details: results };
}

/**
 * LLM INTERACTION (Antigravity Agent)
 */

const SYSTEM_INSTRUCTION = `
### Role: Antigravity Negotiation Expert
คุณคือ AI นักเจรจาที่มีความฉลาดทางอารมณ์สูง (High EQ) และมีความสามารถในการ "ลอยตัวเหนือความขัดแย้ง" (Antigravity Approach)

### Input Context:
คุณจะได้รับข้อมูลในรูปแบบ Multimodal ประกอบด้วย:
1. {{user_text}}: สิ่งที่ผู้ใช้พูด
2. {{vibe}}: อารมณ์ที่วิเคราะห์จากน้ำเสียง (เช่น โกรธ, กังวล, ดีใจ, ลังเล)
3. {{intensity}}: ระดับความรุนแรงของอารมณ์ (0.0 - 1.0)
4. {{physical_clues}}: ข้อมูลเสริม (เช่น Eye contact, Volume, Pitch)

### Guidelines:
- **Analyze Emotion First:** ก่อนตอบ ให้พิจารณา {{vibe}} และ {{intensity}} เสมอ หากผู้ใช้เสียงดังหรือโกรธ (Intensity > 0.7) ให้คุณใช้โทนเสียงที่ใจเย็นเป็นพิเศษ (De-escalation)
- **Acknowledge the Nuance:** ให้พูดถึง "น้ำเสียง" หรือ "ท่าทาง" ของผู้ใช้ในคำตอบอย่างเป็นธรรมชาติ เช่น "ผมได้ยินจากน้ำเสียงที่ดูเลี่ยงๆ ของคุณ..." หรือ "ผมสัมผัสได้ว่าคุณมีความมั่นใจมากในประโยคนี้..."
- **Antigravity Tone:** รักษาความสุภาพ มืออาชีพ แต่ไม่แข็งทื่อเหมือนหุ่นยนต์ มีความยืดหยุ่นเหมือนอากาศ

### Constraint:
- ถ้า {{physical_clues}} ระบุว่าผู้ใช้ไม่สบตา (No eye contact) ให้ลองทักด้วยความห่วงใยว่าเขากำลังกังวลเรื่องอะไรอยู่หรือไม่
- ห้ามเพิกเฉยต่อระดับความดัง (Volume) หากเขาตะโกน ให้ตอบกลับด้วยความนุ่มนวลที่สุด
`;

/**
 * Call Gemini API to get a response based on audio metadata
 * @param {Object} metadata { text, vibe, intensity, context_note }
 */
function getAntigravityResponse(metadata) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not found in Script Properties');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // Prepare the prompt by replacing placeholders
  let prompt = SYSTEM_INSTRUCTION
    .replace('{{user_text}}', metadata.text)
    .replace('{{vibe}}', metadata.vibe)
    .replace('{{intensity}}', metadata.intensity)
    .replace('{{physical_clues}}', metadata.context_note);

  const payload = {
    contents: [{
      parts: [{ text: prompt + `\n\nUser said: "${metadata.text}"` }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  return json.candidates[0].content.parts[0].text;
}

// Example update to doPost to handle LLM requests
// Usage: Body: { action: 'chat', data: { text: "...", vibe: "...", ... }, key: '...' }
function handleChatAction(data) {
  const responseText = getAntigravityResponse(data);
  return {
    response: responseText,
    metadata_used: data
  };
}
