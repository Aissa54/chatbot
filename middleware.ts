// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = [
  '/login',
  '/auth/callback',
  '/auth/confirm',
  '/auth/reset-password'
];

// Routes à ignorer
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
  // Ignorer les routes statiques
  if (shouldIgnoreRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    const pathname = req.nextUrl.pathname;

    // Vérification de la session
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Erreur de session:', sessionError);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Gestion des routes publiques
    if (isPublicRoute(pathname)) {
      if (session) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      return res;
    }

    // Redirection si non authentifié
    if (!session) {
      const redirectUrl = new URL('/login', req.url);
      if (pathname !== '/') {
        redirectUrl.searchParams.set('redirectTo', pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Routes d'administration
    if (pathname.startsWith('/admin')) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')[0];
      const isAdmin = session.user.email === adminEmail;
      
      if (!isAdmin) {
        console.warn(`Accès admin non autorisé: ${session.user.email}`);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // En-têtes de sécurité
    const response = NextResponse.next();
    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    };

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    if (session?.user?.id) {
      response.headers.set('X-User-ID', session.user.id);
    }

    return response;

  } catch (error) {
    console.error('Erreur middleware:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};