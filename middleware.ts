// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configuration
const publicRoutes = [
  '/login',
  '/auth/callback',
  '/auth/confirm',
  '/auth/reset-password'
];

const publicPaths = [
  '/_next',
  '/images',
  '/api/auth',
  '/favicon.ico'
];

const isPublicPath = (path: string): boolean => {
  return publicPaths.some(publicPath => path.startsWith(publicPath));
};

export async function middleware(req: NextRequest) {
  try {
    // Ignorer les ressources statiques et les routes publiques
    const path = req.nextUrl.pathname;
    if (isPublicPath(path)) {
      return NextResponse.next();
    }

    // Initialisation de la réponse et du client Supabase
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Vérification de la session
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    // Gestion des routes publiques
    if (publicRoutes.includes(path)) {
      if (session) {
        // Rediriger vers l'accueil si déjà connecté
        return NextResponse.redirect(new URL('/', req.url));
      }
      return res;
    }

    // Vérification de l'authentification
    if (!session) {
      // Sauvegarder l'URL de redirection
      const redirectUrl = new URL('/login', req.url);
      if (path !== '/') {
        redirectUrl.searchParams.set('redirectTo', path);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Vérification des routes admin
    if (path.startsWith('/admin')) {
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
      const userEmail = session.user?.email;

      if (!userEmail || !adminEmails.includes(userEmail)) {
        console.warn('Unauthorized admin access attempt:', userEmail);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Ajout des en-têtes de sécurité
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // En cas d'erreur, rediriger vers la page de login
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('error', 'auth');
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: [
    // Exclure les fichiers statiques et autres ressources
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};