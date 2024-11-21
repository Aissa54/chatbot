import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const pathname = req.nextUrl.pathname;

  try {
    // Obtenir la session
    const { data: { session } } = await supabase.auth.getSession();

    // Si pas de session, rediriger vers login sauf pour les routes publiques
    if (!session) {
      if (pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      return res;
    }

    // Si déjà connecté et sur login, rediriger vers home
    if (pathname === '/login' && session) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Vérification spécifique pour les routes admin
    if (pathname.startsWith('/admin')) {
      // Liste des emails admin depuis les variables d'environnement
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
      const userEmail = session.user?.email;

      // Vérifier si l'email de l'utilisateur est dans la liste des admins
      if (!userEmail || !adminEmails.includes(userEmail)) {
        console.log('Accès non autorisé à la page admin:', userEmail);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Erreur middleware:', error);
    // En cas d'erreur, rediriger vers login
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

// Mise à jour du matcher pour inclure toutes les routes nécessaires
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};