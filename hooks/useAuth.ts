// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    // Vérification initiale de la session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de session');
        console.error('Erreur lors de la vérification de la session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      // Rediriger en fonction de l'état de la session
      if (!session && !router.pathname.startsWith('/login')) {
        await router.push('/login');
      }
    });

    // Nettoyer la souscription
    return () => {
      subscription.unsubscribe();
    };
  }, [router.pathname]);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Nettoyer les données locales
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Déconnexion de Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Redirection vers la page de login
      await router.push('/login');
      
      // Recharger la page pour nettoyer complètement l'état
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la déconnexion');
      console.error('Erreur lors de la déconnexion:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    if (!session?.user?.email) return false;
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
    return adminEmails.includes(session.user.email);
  };

  return {
    session,
    loading,
    error,
    signOut,
    isAuthenticated: !!session,
    isAdmin: isAdmin(),
    user: session?.user || null,
  };
}

// Types d'export pour TypeScript
export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
};

export type AuthContextType = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: AuthUser | null;
};