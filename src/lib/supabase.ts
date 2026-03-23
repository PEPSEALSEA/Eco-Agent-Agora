import { createClient } from '@supabase/supabase-js';

// Safe localStorage wrapper that works with Next.js SSR hydration
const isBrowser = typeof window !== 'undefined';

const safeLocalStorage = {
  getItem: (key: string) => {
    if (!isBrowser) return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (!isBrowser) return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!isBrowser) return;
    window.localStorage.removeItem(key);
  }
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'eco-agent-auth',
    storage: safeLocalStorage
  }
});
