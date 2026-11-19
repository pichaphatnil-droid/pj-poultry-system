"use client";

// ตัวกลางให้หน้าแอดมินอ่าน/เขียนฐานข้อมูลผ่านเซิร์ฟเวอร์ (/api/admin/db)
// หน้าตาการใช้งานเหมือน supabase client เดิม: adminDb.from("batches").select("*").eq("id", x)
// แต่สิทธิ์จริงตรวจที่เซิร์ฟเวอร์ (ต้องเป็นแอดมินที่ login อยู่) ไม่ใช่กุญแจสาธารณะในเบราว์เซอร์

type DbError = { message: string; code?: string } | null;
// เหมือน supabase เดิม: ผลปกติเป็น array, ถ้าเรียก .single() เป็นแถวเดียว
type DbResult<R = any[]> = { data: R | null; error: DbError };

interface DbRequest {
  table?: string;
  rpc?: string;
  action?: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  returning?: string;
  values?: unknown;
  onConflict?: string;
  filters: [string, unknown][];
  orders: { column: string; ascending: boolean }[];
  limit?: number;
  single?: boolean;
}

const send = async <R,>(request: DbRequest): Promise<DbResult<R>> => {
  try {
    const res = await fetch("/api/admin/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const body = await res.json().catch(() => null);
    if (!body) return { data: null, error: { message: `เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})` } };
    return { data: body.data ?? null, error: body.error ?? null };
  } catch {
    return { data: null, error: { message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต" } };
  }
};

class Query<R = any[]> implements PromiseLike<DbResult<R>> {
  constructor(private request: DbRequest) {}

  select(columns = "*") {
    if (this.request.action === "select") this.request.columns = columns;
    else this.request.returning = columns;
    return this;
  }
  insert(values: unknown) {
    this.request.action = "insert";
    this.request.values = values;
    return this;
  }
  update(values: unknown) {
    this.request.action = "update";
    this.request.values = values;
    return this;
  }
  upsert(values: unknown, options?: { onConflict?: string }) {
    this.request.action = "upsert";
    this.request.values = values;
    this.request.onConflict = options?.onConflict;
    return this;
  }
  delete() {
    this.request.action = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.request.filters.push([column, value]);
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.request.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }
  limit(count: number) {
    this.request.limit = count;
    return this;
  }
  single(): Query<any> {
    this.request.single = true;
    return this as unknown as Query<any>;
  }
  then<A = DbResult<R>, B = never>(
    onFulfilled?: ((value: DbResult<R>) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return send<R>(this.request).then(onFulfilled, onRejected);
  }
}

export const adminDb = {
  from(table: string) {
    return new Query({ table, action: "select", columns: "*", filters: [], orders: [] });
  },
  rpc(name: string) {
    return send<any>({ rpc: name, filters: [], orders: [] });
  },
};
