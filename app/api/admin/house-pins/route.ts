import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import { hashPassword, PIN_PATTERN } from "../../../lib/server/password";
import { requireAdmin } from "../../../lib/server/auth";

const ensureActiveAdmin = async (request: NextRequest) => {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;
  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("role, is_active")
    .eq("id", session.uid)
    .maybeSingle();
  if (!data || data.role !== "admin" || !data.is_active) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }
  return session;
};

// ดูว่าเล้าไหนตั้งรหัสแล้วบ้าง (ไม่ส่งตัวรหัสกลับไป)
export async function GET(request: NextRequest) {
  const session = await ensureActiveAdmin(request);
  if (session instanceof NextResponse) return session;

  const { data, error } = await getSupabaseAdmin()
    .from("house_pins")
    .select("house_number, updated_at, locked_until");
  if (error) {
    return NextResponse.json(
      { error: "ยังไม่ได้รัน SQL ตาราง house_pins", houses: [] },
      { status: 500 },
    );
  }
  return NextResponse.json({ houses: data || [] });
}

// ตั้งรหัสใหม่ให้เล้า (และปลดล็อกถ้าโดนล็อกอยู่)
export async function PUT(request: NextRequest) {
  const session = await ensureActiveAdmin(request);
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => ({}));
  const house = Number(body.house);
  const pin = String(body.pin ?? "").trim();

  if (!Number.isInteger(house) || house < 1 || house > 7) {
    return NextResponse.json({ error: "กรุณาเลือกเล้า 1–7" }, { status: 400 });
  }
  if (!PIN_PATTERN.test(pin)) {
    return NextResponse.json({ error: "รหัสต้องเป็นตัวเลข 4–6 หลัก" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("house_pins")
    .upsert(
      {
        house_number: house,
        pin_hash: await hashPassword(pin),
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "house_number" },
    );

  if (error) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
