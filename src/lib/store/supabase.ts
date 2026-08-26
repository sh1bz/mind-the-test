import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

// Local-first: the app runs fully on localStorage. Supabase only adds magic-link sign-in and
// cross-device sync, and only when real credentials are present.
const URL = env.PUBLIC_SUPABASE_URL ?? '';
const KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseEnabled = !!URL && !!KEY && URL.startsWith('http');

export const supabase = supabaseEnabled
	? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } })
	: null;
