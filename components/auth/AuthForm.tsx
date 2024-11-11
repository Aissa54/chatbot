// components/auth/AuthForm.tsx
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const supabase = createClientComponentClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Debug logs
      console.log('Début de la tentative d\'authentification');
      console.log('URL Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
            data: {
              email: email,
            }
          },
        });

        console.log('Résultat SignUp:', { data, error });

        if (error) throw error;
        
        if (data.user && data.session) {
          router.push('/');
        } else {
          setMessage('Vérifiez votre email pour confirmer votre inscription.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log('Résultat SignIn:', { data, error });

        if (error) throw error;

        if (data.session) {
          router.push('/');
        }
      }
    } catch (error: any) {
      console.error('Erreur complète:', error);
      setMessage(
        error.message === 'Email not confirmed'
          ? 'Veuillez confirmer votre email avant de vous connecter.'
          : error.message || 'Une erreur est survenue'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Créer un compte' : 'Se connecter'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded-lg 
                   hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Chargement...' : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
          </button>

          {message && (
            <p className={`mt-2 text-sm text-center ${
              message.includes('Vérifiez') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            {isSignUp
              ? 'Déjà un compte ? Connectez-vous'
              : 'Pas de compte ? Inscrivez-vous'}
          </button>
        </form>
      </div>
    </div>
  );
}