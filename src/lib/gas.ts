const getGasConfig = () => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('eco-agent-gas-url');
    const savedKey = localStorage.getItem('eco-agent-gas-key');
    return {
      url: savedUrl || process.env.NEXT_PUBLIC_GAS_URL,
      key: savedKey || process.env.NEXT_PUBLIC_GAS_SECRET_KEY
    };
  }
  return {
    url: process.env.NEXT_PUBLIC_GAS_URL,
    key: process.env.NEXT_PUBLIC_GAS_SECRET_KEY
  };
};

export function getAssetPath(path: string) {
  // Matches basePath in next.config.ts
  const basePath = '/Eco-Agent-Agora';
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith(basePath)) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${cleanPath}`;
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function gasFetch(action: string, table?: string, id?: string, extraParams: Record<string, string> = {}) {
  const { url: GAS_URL, key: SECRET_KEY } = getGasConfig();
  if (!GAS_URL || GAS_URL === 'undefined') {
    console.error('CRITICAL: NEXT_PUBLIC_GAS_URL is not set. Check your .env or GitHub Secrets.');
    return { error: 'Backend URL not configured' };
  }
  
  let url;
  try {
    url = new URL(GAS_URL);
  } catch (e) {
    console.error('CRITICAL: NEXT_PUBLIC_GAS_URL is an invalid URL:', GAS_URL);
    return { error: 'Invalid Backend URL' };
  }
  
  url.searchParams.append('action', action);
  if (table) url.searchParams.append('table', table);
  if (id) url.searchParams.append('id', id);
  url.searchParams.append('key', SECRET_KEY || '');
  
  Object.entries(extraParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.append(k, v);
    }
  });

  try {
    const response = await fetch(url.toString());
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse GAS response:', text);
      return { error: 'Invalid JSON response', details: text };
    }
  } catch (err) {
    console.error('GAS Fetch Error:', err);
    return { error: err };
  }
}

/**
 * Post data to Google Apps Script
 */
export async function gasPost(action: 'create' | 'update' | 'upsert' | 'chat' | 'end_session' | 'save_evaluation' | 'get_chat_context' | 'process_chat_result' | 'generate_evaluation' | 'generate_what_if', table: string, data: any, options: { id?: string, queryField?: string, queryValue?: any } = {}) {
  const { url: GAS_URL, key: SECRET_KEY } = getGasConfig();
  if (!GAS_URL || GAS_URL === 'undefined') {
    console.error('CRITICAL: NEXT_PUBLIC_GAS_URL is not set. Check your .env or GitHub Secrets.');
    return { error: 'Backend URL not configured' };
  }

  try {
    const url = new URL(GAS_URL); // Just to validate
  } catch (e) {
    console.error('CRITICAL: NEXT_PUBLIC_GAS_URL is an invalid URL:', GAS_URL);
    return { error: 'Invalid Backend URL' };
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors', // Use 'cors' to allow reading the response
      headers: {
        // Use 'text/plain' to avoid preflight OPTIONS request
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        table,
        data,
        key: SECRET_KEY,
        ...options
      }),
    });
    
    // GAS returns a 302 redirect which fetch follows. 
    // The final response should be the JSON from jsonResponse().
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse GAS response:', text);
      return { error: 'Invalid JSON response', details: text };
    }
  } catch (err) {
    console.error('GAS Post Error:', err);
    return { error: err };
  }
}

/**
 * Optimized: Fetch with Stale-While-Revalidate (SWR) pattern
 * Returns cached data immediately if available, then fetches fresh data.
 * @param callback Optional callback for when fresh data is received
 */
export async function gasFetchWithSWR(action: string, table: string, options: { id?: string, forceRefresh?: boolean } = {}, onUpdate?: (data: any) => void) {
  const cacheKey = `gas-swr-${table}-${options.id || 'all'}`;
  const { url: GAS_URL, key: SECRET_KEY } = getGasConfig();
  
  // 1. Get cached data
  const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  let cachedData = null;
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      cachedData = parsed.data;
      
      // If not forcing refresh and cache is very fresh (e.g. < 30s), just return it
      if (!options.forceRefresh && (Date.now() - parsed.timestamp < 30000)) {
        return { data: cachedData, source: 'cache_fresh' };
      }
    } catch (e) {
      console.error('Cache parse error');
    }
  }

  // 2. Fetch fresh data (non-blocking if we have cache)
  const fetchFresh = async () => {
    try {
      const freshData = await gasFetch(action, table, options.id);
      if (!freshData.error) {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: freshData,
          timestamp: Date.now()
        }));
        if (onUpdate) onUpdate(freshData);
        return freshData;
      }
    } catch (err) {
      console.error('SWR Background Fetch Error:', err);
    }
    return null;
  };

  if (cachedData && !options.forceRefresh) {
    // Fire and forget fetch
    fetchFresh();
    return { data: cachedData, source: 'cache_stale' };
  } else {
    // Wait for fresh data
    const data = await fetchFresh();
    return { data, source: 'network' };
  }
}

/**
 * Optimized: Fetch all data in one go
 */
export async function gasFetchAll() {
  return gasFetch('read_all');
}

/**
 * Optimized: Fetch multiple tables in parallel
 */
export async function gasFetchParallel(tables: string[]) {
  const results = await Promise.all(
    tables.map(table => gasFetch('read', table))
  );
  return tables.reduce((acc, table, i) => {
    acc[table] = results[i];
    return acc;
  }, {} as any);
}
