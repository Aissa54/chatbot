// utils/env.ts
export const env = {
    // Supabase
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    
    // Application
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL!,
    ADMIN_EMAILS: process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [],
    
    // reCAPTCHA
    RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
    
    // Flowise
    FLOWISE_API_KEY: process.env.NEXT_PUBLIC_FLOWISE_API_KEY!,
    FLOWISE_URL: process.env.NEXT_PUBLIC_FLOWISE_URL!,
    
    // Rate Limiting
    RATE_LIMIT_REQUESTS: Number(process.env.NEXT_PUBLIC_RATE_LIMIT_REQUESTS) || 10,
    RATE_LIMIT_INTERVAL: Number(process.env.NEXT_PUBLIC_RATE_LIMIT_INTERVAL) || 60000,
    
    // Session
    SESSION_EXPIRY: Number(process.env.NEXT_PUBLIC_SESSION_EXPIRY) || 3600,
  
    validate() {
      const required = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SITE_URL',
        'RECAPTCHA_SITE_KEY',
        'FLOWISE_API_KEY',
        'FLOWISE_URL'
      ];
  
      for (const key of required) {
        if (!this[key as keyof typeof this]) {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      }
    }
  };
  
  // Valider les variables d'environnement au démarrage
  if (typeof window === 'undefined') {
    env.validate();
  }