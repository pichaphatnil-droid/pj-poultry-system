import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, SAFE_USER_COLUMNS } from "../../../lib/server/supabaseAdmin";
import { hashPassword, PIN_PATTERN } from "../../../lib/server/password";
import { requireAdmin } from "../../../lib/server/auth";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;

const ensureActiveAdmin = async (request: NextRequest) => {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("id, role, is_active")
    .eq("id", session.uid)
    .maybeSingle();
  if (!data || data.role !== "admin" || !data.is_active) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }
  return session;
};

const parseHouse = (value: unknown): number | null | "invalid" => {
  if (value === null || value === undefined || value === "") return null;
  const house = Number(value);
  return Number.isInteger(house) && house >= 1 && house <= 7 ? house : "invalid";
};

// สร้างบัญชีพนักงานใหม่
export async function POST(request: NextRequest) {
  const session = await ensureActiveAdmin(request);
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const fullName = String(body.full_name ?? "").trim();
  const pin = String(body.pin ?? "").trim();
  const role = body.role === "admin" ? "admin" : "worker";
  const house = parseHouse(body.house_number);

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลข 3–30 ตัว (ห้ามเว้นวรรค)" },
      { status: 400 },
    );
  }
  if (!fullName) {
    return NextResponse.json({ error: "กรุณากรอกชื่อ-นามสกุล" }, { status: 400 });
  }
  if (!PIN_PATTERN.test(pin)) {
    return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4–6 หลัก" }, { status: 400 });
  }
  if (house === "invalid" || (role === "worker" && house === null)) {
    return NextResponse.json({ error: "กรุณาเลือกเล้า 1–7" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .insert({
      username,
      full_name: fullName,
      role,
      house_number: role === "worker" ? house : null,
      password_hash: await hashPassword(pin),
      is_active: true,
    })
    .select(SAFE_USER_COLUMNS)
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "ชื่อผู้ใช้นี้มีอยู่แล้ว" : "เพิ่มผู้ใช้ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ user: data });
}

// แก้ไขผู้ใช้: ตั้ง PIN ใหม่ / เปลี่ยนชื่อ / ย้ายเล้า / ระงับ-เปิดใช้งาน
export async function PATCH(request: NextRequest) {
  const session = await ensureActiveAdmin(request);
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.pin !== undefined) {
    const pin = String(body.pin).trim();
    if (!PIN_PATTERN.test(pin)) {
      return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4–6 หลัก" }, { status: 400 });
    }
    updates.password_hash = await hashPassword(pin);
    updates.failed_attempts = 0;
    updates.locked_until = null;
  }

  if (body.full_name !== undefined) {
    const fullName = String(body.full_name).trim();
    if (!fullName) {
      return NextResponse.json({ error: "กรุณากรอกชื่อ-นามสกุล" }, { status: 400 });
    }
    updates.full_name = fullName;
  }

  if (body.house_number !== undefined) {
    const house = parseHouse(body.house_number);
    if (house === "invalid") {
      return NextResponse.json({ error: "กรุณาเลือกเล้า 1–7" }, { status: 400 });
    }
    updates.house_number = house;
  }

  if (body.is_active !== undefined) {
    if (id === session.uid && body.is_active === false) {
      return NextResponse.json(
        { error: "ไม่สามารถระงับบัญชีของตัวเองได้" },
        { status: 400 },
      );
    }
    updates.is_active = Boolean(body.is_active);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องแก้ไข" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .update(updates)
    .eq("id", id)
    .select(SAFE_USER_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 400 });
  }
  return NextResponse.json({ user: data });
}
