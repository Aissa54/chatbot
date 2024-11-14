// components/auth/AuthForm.tsx
import { useState, useRef, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from "react-google-recaptcha";

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const router = useRouter();
  const supabase = createClientComponentClient();

  // Détecter le mode sombre
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const passwordRequirements = [
    { test: /.{8,}/, text: '8 caractères minimum' },
    { test: /[A-Z]/, text: '1 lettre majuscule minimum' },
    { test: /[a-z]/, text: '1 lettre minuscule minimum' },
    { test: /\d/, text: '1 chiffre minimum' },
    { test: /[!@#$%^&*(),.?":{}|<>]/, text: '1 caractère spécial minimum' },
  ];

  const checkPasswordStrength = (pass: string) => {
    return passwordRequirements.map(req => ({
      met: req.test.test(pass),
      text: req.text
    }));
  };

  const handleResetPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setMessage('Instructions de réinitialisation envoyées par email');
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp && !captchaToken) {
      setMessage('Veuillez valider le captcha');
      return;
    }

    if (!email || !password) {
      setMessage('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const requirements = checkPasswordStrength(password);
        const allMet = requirements.every(req => req.met);
        
        if (!allMet) {
          throw new Error('Le mot de passe ne respecte pas les exigences minimales');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              captchaToken,
            }
          },
        });

        if (error) throw error;
        setMessage('Vérifiez votre email pour confirmer votre inscription.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/');
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptchaToken(null);
    }
  };

  const onCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Créer un compte' : 'Se connecter'}
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-2 pr-10 border rounded-lg bg-white dark:bg-gray-700 
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 
                         text-gray-500 hover:text-gray-700 dark:text-gray-400 
                         dark:hover:text-gray-200 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-label="Masquer le mot de passe" />
                ) : (
                  <Eye className="h-5 w-5" aria-label="Afficher le mot de passe" />
                )}
              </button>
            </div>
            
            {isSignUp && (
              <div className="mt-2 space-y-1">
                {checkPasswordStrength(password).map((req, index) => (
                  <div
                    key={index}
                    className={`text-xs flex items-center space-x-1 ${
                      req.met 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    <span>{req.met ? '✓' : '✗'}</span>
                    <span>{req.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isSignUp && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Mot de passe oublié ?
            </button>
          )}

          {isSignUp && (
            <div className="flex justify-center my-4">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                onChange={onCaptchaChange}
                theme={darkMode ? 'dark' : 'light'}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isSignUp && !captchaToken)}
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 
                     transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Chargement...' : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
          </button>

          {message && (
            <p className={`mt-2 text-sm text-center ${
              message.includes('Vérifiez') 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              if (recaptchaRef.current) {
                recaptchaRef.current.reset();
              }
              setCaptchaToken(null);
            }}
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