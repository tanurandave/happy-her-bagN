
import { createClient } from '@supabase/supabase-js';

// Using provided keys as defaults if env vars are missing to ensure immediate functionality for the user.
// In a real production build, these should strictly come from environment variables.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hojzatsjbnahzqbkxaca.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvanphdHNqYm5haHpxYmt4YWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NDkzNjYsImV4cCI6MjA3NzAyNTM2Nn0.CP9bQv6IhsfD3-b7XO275TFTwqWZ2pWDAV6Zow96tMI';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
    return supabaseUrl.length > 0 && supabaseKey.length > 0 && supabaseUrl !== 'YOUR_SUPABASE_URL';
};
