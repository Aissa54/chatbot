// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = [
  '/login',
  '/auth/callback',
  '/auth/confirm',
  '/auth/reset-password'
];

// Routes qui doivent être ignorées par le middleware
const ignoredRoutes = [
  '/_next',
  '/images',
  '/api/auth',
  '/favicon.ico'
];

const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.includes(pathname);
};

const shouldIgnoreRoute = (pathname: string): boolean => {
  return ignoredRoutes.some(route => pathname.startsWith(route));
};

export async function middleware(req: NextRequest) {
  // Ignorer les routes statiques et les ressources
  if (shouldIgnoreRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  try {
    // Initialiser le client Supabase
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    const pathname = req.nextUrl.pathname;

    // Vérifier la session
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Gestion des routes publiques
    if (isPublicRoute(pathname)) {
      if (session) {
        // Rediriger vers la page d'accueil si déjà connecté
        return NextResponse.redirect(new URL('/', req.url));
      }
      return res;
    }

    // Rediriger vers la page de login si non authentifié
    if (!session) {
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      const redirectUrl = new URL('/login', req.url);
      // Sauvegarder l'URL de destination pour la redirection après login
      if (pathname !== '/') {
        redirectUrl.searchParams.set('redirectTo', pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Gestion spéciale des routes admin
    if (pathname.startsWith('/admin')) {
      // Pour l'historique, autoriser tous les utilisateurs authentifiés
      if (pathname === '/admin/history') {
        return res;
      }

      // Pour les autres routes admin, vérifier si l'utilisateur est admin
      const isAdmin = session.user.email === 'aissa.moustaine@gmail.com';
      if (!isAdmin) {
        console.warn('Tentative d\'accès non autorisé à une route admin:', session.user.email);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Ajouter des en-têtes de sécurité
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    // Ajouter l'ID utilisateur aux en-têtes pour le logging si l'utilisateur est connecté
    if (session?.user?.id) {
      response.headers.set('X-User-ID', session.user.id);
    }

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    // En cas d'erreur, rediriger vers la page de login
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }
}

// Configuration du matcher corrigée
export const config = {
  matcher: [
    /*
     * Match only specific paths:
     * - /admin/... (all admin routes)
     * - /login (login page)
     * - / (home page)
     * - all other routes except static files, images, etc.
     */
    '/admin/:path*',
    '/login',
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};