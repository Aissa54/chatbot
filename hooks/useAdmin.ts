import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setIsAdmin(false);
          return;
        }

        // Récupérer le token d'accès
        const { access_token } = session;

        // Appeler l'API avec le token dans l'en-tête
        const response = await fetch('/api/check-admin', {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Erreur lors de la vérification admin:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [supabase]);

  return { isAdmin, loading };
};