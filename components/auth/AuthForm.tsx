// components/auth/AuthForm.tsx
import { useState, useRef, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from "react-google-recaptcha";

// Interface pour les messages d'erreur d'authentification
interface AuthError {
  code: string;
  message: string;
  details?: string;
}

// Interface pour les exigences de mot de passe
interface PasswordRequirement {
  test: RegExp;
  text: string;
  met: boolean;
}

export default function AuthForm() {
  // États pour gérer le formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Références et hooks
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Détection du mode sombre
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setDarkMode(isDarkMode);

    // Observer pour les changements de mode
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Configuration des exigences de mot de passe
  const passwordRequirements = [
    { test: /.{8,}/, text: '8 caractères minimum' },
    { test: /[A-Z]/, text: '1 lettre majuscule minimum' },
    { test: /[a-z]/, text: '1 lettre minuscule minimum' },
    { test: /\d/, text: '1 chiffre minimum' },
    { test: /[!@#$%^&*(),.?":{}|<>]/, text: '1 caractère spécial minimum' },
  ];

  // Vérification de la force du mot de passe
  const checkPasswordStrength = (pass: string): PasswordRequirement[] => {
    return passwordRequirements.map(req => ({
      ...req,
      met: req.test.test(pass)
    }));
  };

  // Gestion de la réinitialisation du mot de passe
  const handleResetPassword = async () => {
    if (!email) {
      setMessage('Veuillez entrer votre email');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;
      
      setMessage('Instructions de réinitialisation envoyées par email');
      setMessageType('success');
    } catch (error: any) {
      console.error('Erreur de réinitialisation:', error);
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Gestion de l'authentification
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des entrées
    if (isSignUp && !captchaToken) {
      setMessage('Veuillez valider le captcha');
      setMessageType('error');
      return;
    }

    if (!email || !password) {
      setMessage('Veuillez remplir tous les champs');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // Vérification des exigences du mot de passe
        const requirements = checkPasswordStrength(password);
        const allMet = requirements.every(req => req.met);
        
        if (!allMet) {
          throw new Error('Le mot de passe ne respecte pas les exigences minimales');
        }

        // Inscription
        const { data, error } = await supabase.auth.signUp({
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
        setMessageType('success');
      } else {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/');
      }
    } catch (error: any) {
      console.error('Erreur d\'authentification:', error);
      
      // Gestion des messages d'erreur spécifiques
      const errorMessage = error.message.includes('Invalid login credentials')
        ? 'Email ou mot de passe incorrect'
        : error.message.includes('Email not confirmed')
        ? 'Veuillez confirmer votre email avant de vous connecter'
        : error.message.includes('Database error')
        ? 'Erreur de connexion à la base de données. Veuillez réessayer.'
        : error.message;

      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptchaToken(null);
    }
  };

  // Gestion du changement de captcha
  const onCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  // Rendu du composant
  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Créer un compte' : 'Se connecter'}
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Champ Email */}
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

          {/* Champ Mot de passe */}
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
            
            {/* Indicateurs de force du mot de passe */}
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

          {/* Lien de réinitialisation du mot de passe */}
          {!isSignUp && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Mot de passe oublié ?
            </button>
          )}

          {/* ReCAPTCHA pour l'inscription */}
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

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={loading || (isSignUp && !captchaToken)}
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 
                     transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Chargement...' : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
          </button>

          {/* Message de retour */}
          {message && (
            <p className={`mt-2 text-sm text-center ${
              messageType === 'success'
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {message}
            </p>
          )}

          {/* Bouton de basculement inscription/connexion */}
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