import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./app/lib/session";

// ตรวจ cookie ที่เซิร์ฟเวอร์ลงลายเซ็นไว้ ก่อนให้เข้าหน้าแอดมิน/พนักงาน
// (แก้ค่าใน localStorage เองจะเข้าหน้าแอดมินไม่ได้อีกต่อไป)
export async function middleware(request: NextRequest) {
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const { pathname } = request.nextUrl;
  const requiredRole = pathname.startsWith("/admin") ? "admin" : "worker";

  if (!session || session.role !== requiredRole) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/worker/:path*"],
};
