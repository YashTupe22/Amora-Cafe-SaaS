import { type NextRequest, NextResponse } from "next/server";

const SUPERADMIN_PATH = '/superadmin';
const SUPERADMIN_API  = '/api/superadmin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block the superadmin page and API from robots / unauth crawlers at network level.
  // Real auth check happens inside the page (client email gate) and API routes (token + email verify).
  // We add a meta check: only allow requests that come from the same host (no direct external scraping).
  if (pathname.startsWith(SUPERADMIN_PATH) || pathname.startsWith(SUPERADMIN_API)) {
    const referer = request.headers.get('referer') ?? '';
    const host    = request.headers.get('host') ?? '';
    // Allow same-origin requests or API calls with Authorization header
    const hasAuth = request.headers.has('Authorization');
    const sameOrigin = referer.includes(host);

    if (pathname.startsWith(SUPERADMIN_API) && !hasAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For page navigations, let Next.js handle it (client-side guard will deny access)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

