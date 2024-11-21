// hooks/useAdmin.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/auth-helpers-nextjs';

// Définition des types
interface AdminState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  user: User | null;
}

// Liste des emails admin
const ADMIN_EMAILS = ['aissa.moustaine@gmail.com']; // Même liste que dans le middleware

export function useAdmin() {
  // State avec TypeScript
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    loading: true,
    error: null,
    user: null
  });

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error('Erreur lors de la récupération de la session');
        }

        if (!session) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Session non trouvée',
            isAdmin: false
          }));
          router.push('/');
          return;
        }

        const userEmail = session.user?.email;

        if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Accès non autorisé',
            isAdmin: false,
            user: session.user
          }));
          router.push('/');
          return;
        }

        setState({
          isAdmin: true,
          loading: false,
          error: null,
          user: session.user
        });

      } catch (error) {
        console.error('Erreur de vérification admin:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          isAdmin: false
        }));
        router.push('/');
      }
    };

    // Vérification initiale
    checkAdmin();

    // Abonnement aux changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState({
          isAdmin: false,
          loading: false,
          error: null,
          user: null
        });
        router.push('/');
      } else if (event === 'SIGNED_IN') {
        checkAdmin();
      }
    });

    // Cleanup de l'abonnement
    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  // Méthode pour vérifier manuellement le statut admin
  const verifyAdminStatus = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return Boolean(session?.user?.email && ADMIN_EMAILS.includes(session.user.email));
    } catch (error) {
      console.error('Erreur lors de la vérification du statut admin:', error);
      return false;
    }
  };

  return {
    isAdmin: state.isAdmin,
    loading: state.loading,
    error: state.error,
    user: state.user,
    verifyAdminStatus
  };
}