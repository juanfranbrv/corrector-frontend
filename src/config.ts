// src/config.ts
export const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://127.0.0.1:8000';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';


// aqui deberian ir todas aquella constantes de la app y no so las del entorno