// utils/sessionManager.ts
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';

export class SessionManager {
  private static instance: SessionManager;
  private supabase = createClientComponentClient();
  private sessionCache: Session | null = null;
  readonly sessionExpiry: number;

  private constructor() {
    this.sessionExpiry = Number(process.env.NEXT_PUBLIC_SESSION_EXPIRY) || 3600;
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  getSessionExpiry(): number {
    return this.sessionExpiry;
  }

  async getSession(): Promise<Session | null> {
    if (this.sessionCache) {
      const now = Date.now() / 1000;
      if (this.sessionCache.expires_at && this.sessionCache.expires_at > now) {
        return this.sessionCache;
      }
    }

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      
      this.sessionCache = session;
      return session;
    } catch (error) {
      console.error('Session error:', error);
      return null;
    }
  }

  async refreshSession(): Promise<void> {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession();
      if (error) throw error;
      this.sessionCache = session;
    } catch (error) {
      console.error('Session refresh error:', error);
      this.sessionCache = null;
    }
  }
}

// Hook personnalisé séparé
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const manager = SessionManager.getInstance();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const currentSession = await manager.getSession();
        if (mounted) {
          setSession(currentSession);
          setLoading(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    const refreshInterval = setInterval(() => {
      manager.refreshSession();
    }, (manager.getSessionExpiry() / 2) * 1000);

    checkSession();

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  return {
    session,
    loading,
    manager
  };
}

export const sessionManager = SessionManager.getInstance();