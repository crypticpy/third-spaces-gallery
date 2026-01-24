/**
 * Supabase Configuration for Third Spaces Gallery
 *
 * IMPORTANT: Only use the anon/public key here, NEVER the service_role key
 */

// Replace these with your actual Supabase credentials
const SUPABASE_URL = "https://xnmwjuckcxhfzalbzbch.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE"; // Get from Supabase Dashboard > Settings > API

// Initialize Supabase client
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient && typeof supabase !== "undefined") {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Export for use in other scripts
window.ThirdSpacesSupabase = {
  getClient: getSupabase,
  url: SUPABASE_URL,
  isConfigured: () => SUPABASE_ANON_KEY !== "YOUR_ANON_KEY_HERE",
};
