// hooks/useAuthManager.ts
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthResponse {
  success: boolean;
  error?: string;
}

export function useAuthManager() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setState(prev => ({
          ...prev,
          user: session?.user || null,
          loading: false
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Erreur de vérification de session',
          loading: false
        }));
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user || null,
          loading: false
        }));

        if (event === 'SIGNED_IN') {
          router.push('/');
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const signOut = async (): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const resetPassword = async (email: string): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return { success: false, error: error.message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signOut,
    resetPassword
  };
}

// hooks/useAdmin.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Définissez vos emails admin ici ou utilisez une variable d'environnement
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || ['aissa.moustaine@gmail.com'];

interface AdminState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useAdmin() {
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    loading: true,
    error: null
  });

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Si pas de session, rediriger vers login
          router.push('/login');
          return;
        }

        const userEmail = session.user.email;
        const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail) : false;

        if (!isAdmin) {
          // Si pas admin, rediriger vers home
          router.push('/');
          return;
        }

        setState({
          isAdmin: true,
          loading: false,
          error: null
        });

      } catch (error: any) {
        setState({
          isAdmin: false,
          loading: false,
          error: 'Erreur lors de la vérification des droits administrateur'
        });
        router.push('/');
      }
    };

    checkAdmin();
  }, [router, supabase.auth]);

  const verifyAdminAccess = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return false;
      return ADMIN_EMAILS.includes(session.user.email);
    } catch (error) {
      return false;
    }
  };

  return {
    isAdmin: state.isAdmin,
    loading: state.loading,
    error: state.error,
    verifyAdminAccess
  };
}