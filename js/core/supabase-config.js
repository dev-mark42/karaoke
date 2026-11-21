// Configuración pública de Supabase para el navegador.
// La publishable key está diseñada para uso público; la seguridad real depende de RLS.
// NUNCA coloques aquí una sb_secret_ o service_role.
export const SUPABASE_URL = 'https://flrqvqkkiocvaunearww.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_M8kbbfTMYM-vIVYbCWww3w_3r4z19el';
export const SUPABASE_READY = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
