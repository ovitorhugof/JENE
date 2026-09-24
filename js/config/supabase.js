"use strict";

(() => {
  const SUPABASE_URL = "https://zyabbqiwyqezxbikqjkb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Qjq-1XzVC_O12Sp-w0TYKg_fElqT2VE";

  if (!window.supabase?.createClient) {
    throw new Error("O cliente do Supabase não foi carregado.");
  }

  window.JeneSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  );
})();
