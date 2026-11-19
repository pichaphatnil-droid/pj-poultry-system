import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin";
import { requireAdmin } from "../../../lib/server/auth";

// รับคำสั่งอ่าน/เขียนจากหน้าแอดมิน แล้วทำแทนด้วย service role
// เฉพาะแอดมินที่ login อยู่และยังใช้งานได้ และเฉพาะตาราง/คำสั่งที่อนุญาตไว้ด้านล่าง

const WRITABLE_TABLES = new Set([
  "batches",
  "daily_records",
  "batch_house_counts",
  "batch_house_weight_sessions",
  "activity_logs",
  "farm_settings",
  "line_recipients",
]);
const READ_ONLY_TABLES = new Set(["users"]);
const ALLOWED_RPC = new Set(["close_scheduled_batches"]);
const ACTIONS = new Set(["select", "insert", "update", "upsert", "delete"]);
const COLUMN_NAME = /^[a-z_][a-z0-9_]*$/;
const SECRET_COLUMNS = /password_hash|pin_hash|failed_attempts|locked_until/;

// จำผลการเช็กสิทธิ์แอดมินไว้ 60 วินาที (ลดการถามฐานข้อมูลซ้ำทุกคำขอ)
const ADMIN_CHECK_TTL_MS = 60_000;
const verifiedAdmins = new Map<string, number>();

const fail = (message: string, status = 400) =>
  NextResponse.json({ data: null, error: { message } }, { status });

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return fail("ไม่มีสิทธิ์ทำรายการนี้ กรุณาเข้าสู่ระบบใหม่", 403);

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error: any) {
    return fail(error.message, 500);
  }

  if ((verifiedAdmins.get(session.uid) ?? 0) < Date.now()) {
    const { data: admin } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", session.uid)
      .maybeSingle();
    if (!admin || admin.role !== "admin" || !admin.is_active) {
      verifiedAdmins.delete(session.uid);
      return fail("ไม่มีสิทธิ์ทำรายการนี้ กรุณาเข้าสู่ระบบใหม่", 403);
    }
    verifiedAdmins.set(session.uid, Date.now() + ADMIN_CHECK_TTL_MS);
  }

  const body = await request.json().catch(() => null);
  if (!body) return fail("คำขอไม่ถูกต้อง");

  // ---- เรียก function ในฐานข้อมูล
  if (body.rpc) {
    if (!ALLOWED_RPC.has(body.rpc)) return fail("ไม่อนุญาตคำสั่งนี้", 403);
    const { data, error } = await supabase.rpc(body.rpc);
    return NextResponse.json({ data, error: error ? { message: error.message, code: error.code } : null });
  }

  // ---- ตรวจคำขอ
  const { table, action } = body;
  const columns: string = typeof body.columns === "string" ? body.columns : "*";
  const returning: string | undefined = typeof body.returning === "string" ? body.returning : undefined;
  const filters: [string, unknown][] = Array.isArray(body.filters) ? body.filters : [];
  const orders: { column: string; ascending: boolean }[] = Array.isArray(body.orders) ? body.orders : [];

  if (!ACTIONS.has(action)) return fail("ไม่อนุญาตคำสั่งนี้", 403);
  const readOnly = READ_ONLY_TABLES.has(table);
  if (!WRITABLE_TABLES.has(table) && !readOnly) return fail("ไม่อนุญาตตารางนี้", 403);
  if (readOnly && action !== "select") return fail("ตารางนี้แก้ผ่านหน้าจัดการผู้ใช้เท่านั้น", 403);
  if (table === "users" && (columns.includes("*") || SECRET_COLUMNS.test(columns))) {
    return fail("ต้องระบุคอลัมน์ของผู้ใช้ที่ต้องการ", 403);
  }
  if (SECRET_COLUMNS.test(columns) || (returning && SECRET_COLUMNS.test(returning))) {
    return fail("ไม่อนุญาตคอลัมน์นี้", 403);
  }
  for (const [column] of filters) if (!COLUMN_NAME.test(column)) return fail("ชื่อคอลัมน์ไม่ถูกต้อง");
  for (const { column } of orders) if (!COLUMN_NAME.test(column)) return fail("ชื่อคอลัมน์ไม่ถูกต้อง");
  if ((action === "update" || action === "delete") && filters.length === 0) {
    return fail("ต้องระบุเงื่อนไขก่อนแก้หรือลบข้อมูล");
  }

  // ---- สร้างคำสั่ง
  let query: any = supabase.from(table);
  if (action === "select") query = query.select(columns);
  else if (action === "insert") query = query.insert(body.values);
  else if (action === "update") query = query.update(body.values);
  else if (action === "upsert")
    query = query.upsert(body.values, body.onConflict ? { onConflict: String(body.onConflict) } : undefined);
  else query = query.delete();

  if (action !== "select" && returning !== undefined) query = query.select(returning || "*");
  for (const [column, value] of filters) query = query.eq(column, value);
  for (const { column, ascending } of orders) query = query.order(column, { ascending: ascending !== false });
  if (typeof body.limit === "number") query = query.limit(body.limit);
  if (body.single) query = query.single();

  const { data, error } = await query;
  return NextResponse.json({
    data: data ?? null,
    error: error ? { message: error.message, code: error.code } : null,
  });
}
