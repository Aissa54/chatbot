// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Récupérer les emails admin depuis les variables d'environnement
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { pathname } = req.nextUrl;

  // Vérifier la session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Debug logs
  console.log({
    pathname,
    hasSession: !!session,
    userEmail: session?.user?.email,
    adminEmails: ADMIN_EMAILS,
    isAdmin: session?.user?.email ? ADMIN_EMAILS.includes(session.user.email) : false
  });

  // Protection des routes admin
  if (pathname.startsWith('/admin')) {
    if (!session) {
      console.log('No session, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    if (!ADMIN_EMAILS.includes(session.user.email || '')) {
      console.log('Not admin, redirecting to home');
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Autres routes protégées
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*']
};