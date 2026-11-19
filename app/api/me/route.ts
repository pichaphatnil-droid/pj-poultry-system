import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, SAFE_USER_COLUMNS } from "../../lib/server/supabaseAdmin";
import { clearSessionCookie, getSession, setSessionCookie } from "../../lib/server/auth";

// คืนข้อมูลผู้ใช้ที่ login อยู่ และต่ออายุ cookie ให้อีก 90 วัน
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const { data: user } = await getSupabaseAdmin()
      .from("users")
      .select(SAFE_USER_COLUMNS)
      .eq("id", session.uid)
      .maybeSingle();

    if (!user || !user.is_active) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }

    const response = NextResponse.json({ user });
    await setSessionCookie(response, user);
    return response;
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
