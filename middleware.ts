// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['aissa.moustaine@gmail.com'];

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { pathname } = req.nextUrl;

  try {
    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();

    // Si c'est une route publique
    if (PUBLIC_ROUTES.includes(pathname)) {
      // Si déjà connecté, rediriger vers home
      if (session) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      return res;
    }

    // Si pas de session, rediriger vers login
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Vérification des routes admin
    if (pathname.startsWith('/admin')) {
      const isAdmin = ADMIN_EMAILS.includes(session.user.email || '');
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return res;
    
  } catch (error) {
    // En cas d'erreur, rediriger vers login
    console.error('Middleware error:', error);
    if (!PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/admin/:path*'
  ]
};