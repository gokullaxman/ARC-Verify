import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_SECRET } from '@/lib/env';

const SESSION_COOKIE_NAME = 'arc_verify_session';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function verifySignedCookieEdge(token: string | undefined): Promise<{ uid: string; role: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlToUint8Array(sigB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      encoder.encode(payloadB64)
    );
    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    const parsed = JSON.parse(payloadJson);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!parsed?.uid || !parsed?.exp || parsed.exp <= nowSec) {
      return null;
    }
    return { uid: parsed.uid, role: parsed.role };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySignedCookieEdge(rawToken);

  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/documents/sample-') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout';

  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/cases', request.url));
  }

  if (!isPublicPath && !session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Authentication required. Valid signed httpOnly session cookie missing or expired.',
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|webp|svg|gif)$).*)'],
};
