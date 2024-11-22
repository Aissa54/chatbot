import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Créer le client Supabase
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const pathname = req.nextUrl.pathname;

  try {
    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();

    // Routes publiques qui ne nécessitent pas d'authentification
    if (pathname === '/login') {
      if (session) {
        // Si déjà connecté, rediriger vers l'accueil
        return NextResponse.redirect(new URL('/', req.url));
      }
      return res;
    }

    // Protection des routes authentifiées
    if (!session) {
      console.log('No session, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Vérification spécifique pour les routes admin
    if (pathname.startsWith('/admin')) {
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
      const userEmail = session.user?.email;

      console.log({
        type: 'Admin Access Check',
        pathname,
        adminEmails,
        userEmail,
        hasAccess: userEmail ? adminEmails.includes(userEmail) : false
      });

      if (!userEmail || !adminEmails.includes(userEmail)) {
        console.log('Admin access denied for:', userEmail);
        return NextResponse.redirect(new URL('/', req.url));
      }

      console.log('Admin access granted for:', userEmail);
    }

    // Continuer la requête
    return res;

  } catch (error) {
    console.error('Middleware error:', error);
    // En cas d'erreur, rediriger vers login
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)'
  ]
};