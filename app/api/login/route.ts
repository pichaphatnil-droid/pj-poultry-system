import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/server/supabaseAdmin";
import { hashPassword, verifyPassword } from "../../lib/server/password";
import { setSessionCookie } from "../../lib/server/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const INVALID_MESSAGE = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

export async function POST(request: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  if (!username || !password) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from("users")
      .select(
        "id, username, full_name, role, house_number, is_active, created_at, updated_at, password_hash, failed_attempts, locked_until",
      )
      .eq("username", username)
      .maybeSingle();

    if (!user || !user.is_active) {
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      const minutesLeft = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000,
      );
      return NextResponse.json(
        {
          error: `ใส่รหัสผิดหลายครั้ง กรุณารออีก ${minutesLeft} นาที หรือให้แอดมินตั้งรหัสใหม่`,
        },
        { status: 429 },
      );
    }

    const { ok, needsRehash } = await verifyPassword(password, user.password_hash);

    if (!ok) {
      const attempts = (user.failed_attempts || 0) + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      await supabase
        .from("users")
        .update({
          failed_attempts: locked ? 0 : attempts,
          locked_until: locked
            ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
            : null,
        })
        .eq("id", user.id);
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
    }

    const updates: Record<string, unknown> = { failed_attempts: 0, locked_until: null };
    if (needsRehash) updates.password_hash = await hashPassword(password);
    await supabase.from("users").update(updates).eq("id", user.id);

    const {
      password_hash: _hash,
      failed_attempts: _attempts,
      locked_until: _locked,
      ...safeUser
    } = user;

    const response = NextResponse.json({ user: safeUser });
    await setSessionCookie(response, safeUser);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}
