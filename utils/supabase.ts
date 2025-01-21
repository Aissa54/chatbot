import { createClient } from '@supabase/supabase-js';

export type ChatMessage = {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
};

// Vérification de l'environnement et des variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement Supabase manquantes');
}

// Configuration du client Supabase avec options étendues
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'coldbot-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    headers: {
      'x-application-name': 'coldbot'
    }
  }
});

// Fonction utilitaire pour vérifier la connexion
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('health_check').select('*').limit(1);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (error) {
    console.error('Erreur de connexion Supabase:', error);
    return { ok: false, error };
  }
};