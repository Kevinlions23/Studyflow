// Creates a single shared Supabase client for the whole app.
// Loaded from the official CDN as an ES module — no build step, no npm.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // handles the password-recovery link
    },
});
