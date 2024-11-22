import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const pathname = req.nextUrl.pathname;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Route de déconnexion
    if (pathname === '/api/auth/signout') {
      return res;
    }

    // Routes publiques
    if (pathname === '/login') {
      if (session) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      return res;
    }

    // Protection des routes authentifiées
    if (!session) {
      console.log('No session, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Vérification des routes admin
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

    return res;

  } catch (error) {
    console.error('Middleware error:', error);
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