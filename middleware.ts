// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Liste des emails admin
const ADMIN_EMAILS = ['aissa.moustaine@gmail.com']; // Ajoutez vos emails admin ici

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { pathname } = req.nextUrl;

  // Vérifier la session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protection des routes admin
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    // Vérifier si l'utilisateur est admin
    if (!ADMIN_EMAILS.includes(session.user.email || '')) {
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