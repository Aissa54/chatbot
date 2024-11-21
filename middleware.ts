import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];
const PUBLIC_ROUTES = ['/login', '/signup', '/reset-password'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { pathname } = req.nextUrl;

    // Si c'est une route publique
    if (PUBLIC_ROUTES.includes(pathname)) {
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
    console.error('Middleware error:', error);
    if (!PUBLIC_ROUTES.includes(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }
}

export const config = {
  matcher: ['/', '/login', '/signup', '/reset-password', '/admin/:path*']
};