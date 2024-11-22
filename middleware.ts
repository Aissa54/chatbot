// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';

// Configuration du Rate Limiting
const ratelimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
});

async function checkRateLimit(req: NextRequest): Promise<boolean> {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous';
  const tokenKey = `${ip}-${req.nextUrl.pathname}`;
  const tokenCount = (ratelimit.get(tokenKey) as number) || 0;

  if (tokenCount >= 10) { // 10 requêtes par minute
    return false;
  }

  ratelimit.set(tokenKey, tokenCount + 1);
  return true;
}

// Routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = [
  '/login',
  '/auth/callback',
  '/auth/confirm',
  '/_next',
  '/api/auth',
  '/favicon.ico',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const pathname = req.nextUrl.pathname;

  // Vérifier si c'est une route publique
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return res;
  }

  try {
    // Vérification du rate limit pour les routes API
    if (pathname.startsWith('/api')) {
      const rateLimitOk = await checkRateLimit(req);
      if (!rateLimitOk) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }
    }

    // Vérification de la session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Gérer la redirection de la page login
    if (pathname === '/login' && session) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Protection des routes authentifiées
    if (!session) {
      // Permettre les assets statiques et autres ressources publiques
      if (pathname.startsWith('/_next') || pathname.startsWith('/public')) {
        return res;
      }
      
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Vérification des routes admin
    if (pathname.startsWith('/admin')) {
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
      const userEmail = session.user?.email;

      if (!userEmail || !adminEmails.includes(userEmail)) {
        console.warn('Admin access denied for:', userEmail);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Ajouter des en-têtes de sécurité supplémentaires
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};