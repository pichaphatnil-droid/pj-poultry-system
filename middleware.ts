import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This is a client-side auth check placeholder
  // In production, implement proper server-side auth with Supabase
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*'],
};
