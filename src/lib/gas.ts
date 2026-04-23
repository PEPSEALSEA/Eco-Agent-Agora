const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;
const SECRET_KEY = process.env.NEXT_PUBLIC_GAS_SECRET_KEY;

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Fetch data from Google Apps Script
 */
export async function gasFetch(action: string, table?: string, id?: string) {
  if (!GAS_URL) return { error: 'GAS URL not configured' };
  
  const url = new URL(GAS_URL);
  url.searchParams.append('action', action);
  if (table) url.searchParams.append('table', table);
  if (id) url.searchParams.append('id', id);
  url.searchParams.append('key', SECRET_KEY || '');

  try {
    const response = await fetch(url.toString());
    return await response.json();
  } catch (err) {
    console.error('GAS Fetch Error:', err);
    return { error: err };
  }
}

/**
 * Post data to Google Apps Script
 */
export async function gasPost(action: 'create' | 'update' | 'upsert', table: string, data: any, options: { id?: string, queryField?: string, queryValue?: any } = {}) {
  if (!GAS_URL) return { error: 'GAS URL not configured' };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors', // GAS often requires no-cors for simple POST, but it won't return JSON. 
      // Better: GAS usually handles CORS if you return JSON correctly. 
      // Using 'cors' is preferred if the GAS script is set up for it.
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        table,
        data,
        key: SECRET_KEY,
        ...options
      }),
    });
    
    // Note: GAS redirection can sometimes cause issues with fetch in some environments.
    // Usually, ContentService returns a 200 with the JSON body.
    return await response.json();
  } catch (err) {
    console.error('GAS Post Error:', err);
    return { error: err };
  }
}

/**
 * Optimized: Fetch all data in one go
 */
export async function gasFetchAll() {
  return gasFetch('read_all');
}
