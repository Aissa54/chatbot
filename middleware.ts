// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { pathname } = req.nextUrl;

  // Vérifier la session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Gérer les routes d'authentification
  if (pathname.startsWith('/auth')) {
    return res;
  }

  // Routes publiques qui ne nécessitent pas d'authentification
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  if (publicRoutes.includes(pathname)) {
    if (session) {
      // Si l'utilisateur est connecté et essaie d'accéder à une page publique, rediriger vers la page d'accueil
      return NextResponse.redirect(new URL('/', req.url));
    }
    return res;
  }

  // Protéger toutes les autres routes
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

// Configuration des routes à gérer par le middleware
export const config = {
  matcher: [
    /*
     * Match tous les chemins sauf :
     * 1. /api/auth (routes d'authentification)
     * 2. /_next (fichiers Next.js)
     * 3. /_static (fichiers statiques)
     * 4. /images (images)
     * 5. /favicon.ico, /robots.txt, etc.
     */
    '/((?!api/auth|_next|_static|images|favicon.ico|robots.txt).*)',
  ],
};