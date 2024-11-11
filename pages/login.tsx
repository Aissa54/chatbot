// pages/login.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthForm from '@/components/auth/AuthForm';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };

    checkUser();
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 dark:bg-gray-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <Image
              src="/images/logo.png"
              alt="ColdBot Logo"
              width={64}
              height={64}
              className="rounded-full object-cover mx-auto"
              priority
              unoptimized
            />
          </div>

          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Bienvenue sur ColdBot
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Votre assistant spécialiste du froid
          </p>
        </div>

        <div className="mt-8">
          <AuthForm />
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
              conditions d&apos;utilisation
            </a>{' '}
            et notre{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
              politique de confidentialité
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}