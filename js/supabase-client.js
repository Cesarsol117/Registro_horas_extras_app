// ============================================================================
// Conexion a Supabase.
//
// IMPORTANTE: reemplaza los dos valores de abajo por los de TU proyecto.
// Los encuentras en supabase.com -> tu proyecto -> "Project Settings" (el
// icono de engranaje) -> "API". Copia el "Project URL" y la "anon public"
// key (NO la "service_role", esa nunca va en un archivo que subes a GitHub).
// ============================================================================

const SUPABASE_URL = 'https://qvnsuqdyeoemhjrzsqjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bnN1cWR5ZW9lbWhqcnpzcWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MjI5ODQsImV4cCI6MjEwNDM5ODk4NH0.sYq7eQs4SO4Be4_OSG1cVaxuNYi5FXW9JgDor1wP_FE';

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
