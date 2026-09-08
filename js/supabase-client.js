// ============================================================================
// Conexion a Supabase.
//
// IMPORTANTE: reemplaza los dos valores de abajo por los de TU proyecto.
// Los encuentras en supabase.com -> tu proyecto -> "Project Settings" (el
// icono de engranaje) -> "API". Copia el "Project URL" y la "anon public"
// key (NO la "service_role", esa nunca va en un archivo que subes a GitHub).
// ============================================================================

const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY';

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
