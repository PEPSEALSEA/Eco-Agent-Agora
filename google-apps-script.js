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
    .setMimeType(ContentService.MimeType.JSON);
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
