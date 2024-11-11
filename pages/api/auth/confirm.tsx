// pages/auth/confirm.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ConfirmPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Erreur lors de la confirmation:', error);
        router.push('/login?error=confirmation_failed');
      } else {
        router.push('/');
      }
    };

    // Vérifier si nous sommes sur la page de confirmation
    if (router.query.token) {
      handleEmailConfirmation();
    }
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Confirmation de votre compte
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Veuillez patienter pendant que nous confirmons votre compte...
          </p>
        </div>
      </div>
    </div>
  );
}