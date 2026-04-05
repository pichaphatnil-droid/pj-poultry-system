# คู่มือการติดตั้งและตั้งค่าระบบ

## 📋 ขั้นตอนการติดตั้งแบบละเอียด

### ขั้นตอนที่ 1: เตรียม Supabase Project

#### 1.1 สร้าง Project
1. เข้า https://supabase.com
2. คลิก "New Project"
3. กรอกข้อมูล:
   - Name: `pj-poultry-system`
   - Database Password: **จดรหัสผ่านนี้ไว้**
   - Region: เลือก `Southeast Asia (Singapore)`
4. คลิก "Create new project" และรอประมาณ 2-3 นาที

#### 1.2 คัดลอก API Keys
1. ไปที่เมนู `Settings` → `API`
2. คัดลอกค่าต่อไปนี้:
   - **Project URL** (ตัวอย่าง: https://xxxxx.supabase.co)
   - **anon public** key (รหัสยาวๆ ขึ้นต้นด้วย eyJ...)

#### 1.3 รัน SQL Schema
1. ไปที่เมนู `SQL Editor`
2. คลิก `+ New query`
3. **คัดลอกโค้ดจากไฟล์ `supabase-schema.sql` ทั้งหมด** แล้ววางลงไป
4. **สำคัญ:** ก่อนรัน ต้องแก้ไขส่วนรหัสผ่าน

### ขั้นตอนที่ 2: สร้างรหัสผ่านสำหรับ Users

เนื่องจากระบบใช้ password hashing คุณมี 2 ทางเลือก:

#### ทางเลือกที่ 1: ใช้รหัสผ่าน Plain Text (สำหรับทดสอบเท่านั้น)
ลบส่วน password hashing ออก และแก้ไข SQL เป็น:

```sql
-- Admin
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('admin', 'admin123', 'ผู้ดูแลระบบ', 'admin');

-- Workers
INSERT INTO users (username, password_hash, full_name, role, house_number) VALUES
('worker1', 'worker123', 'พนักงานเล้า 1', 'worker', 1),
('worker2', 'worker123', 'พนักงานเล้า 2', 'worker', 2),
('worker3', 'worker123', 'พนักงานเล้า 3', 'worker', 3),
('worker4', 'worker123', 'พนักงานเล้า 4', 'worker', 4),
('worker5', 'worker123', 'พนักงานเล้า 5', 'worker', 5),
('worker6', 'worker123', 'พนักงานเล้า 6', 'worker', 6),
('worker7', 'worker123', 'พนักงานเล้า 7', 'worker', 7);
```

**แล้วแก้ไขไฟล์ `app/lib/supabase.ts`** บรรทัด 23-24 เป็น:

```typescript
// Simple password check for testing
if (data.password_hash !== password) {
  throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
}
```

#### ทางเลือกที่ 2: ใช้ Bcrypt (แนะนำ)
1. ติดตั้ง bcrypt:
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

2. สร้าง hash password:
```javascript
// สร้างไฟล์ hash-password.js
const bcrypt = require('bcryptjs');

const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

3. รัน: `node hash-password.js`
4. นำ hash ที่ได้ไปใส่ใน SQL

5. แก้ไข `app/lib/supabase.ts`:
```typescript
import bcrypt from 'bcryptjs';

// ในฟังก์ชัน signIn
if (!bcrypt.compareSync(password, data.password_hash)) {
  throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
}
```

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables

1. สร้างไฟล์ `.env.local` ในโฟลเดอร์หลัก:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. แทนที่ค่าด้วย URL และ Key ที่คัดลอกมาจากขั้นตอนที่ 1.2

### ขั้นตอนที่ 4: ติดตั้ง Dependencies และรัน

```bash
# ติดตั้ง
npm install

# รันในโหมด development
npm run dev
```

เปิดเบราว์เซอร์: http://localhost:3000

### ขั้นตอนที่ 5: ทดสอบระบบ

#### ทดสอบ Admin
1. Login ด้วย `admin` / `admin123`
2. ไปที่แท็บ "จัดการรุ่น"
3. คลิก "+ สร้างรุ่นใหม่"
4. กรอก:
   - ชื่อรุ่น: `รุ่นทดสอบ 2024-01`
   - วันที่เริ่มรุ่น: `วันนี้`
   - จำนวนเริ่มต้น: `50000` (ตัวเลือก)
5. คลิก "สร้างรุ่น"

#### ทดสอบ Worker
1. Logout
2. Login ด้วย `worker1` / `worker123`
3. กรอกข้อมูลในแท็บช่วงเช้า
4. กดบันทึก
5. ทดสอบแท็บช่วงบ่าย

#### ตรวจสอบข้อมูล
1. Login กลับเข้า admin
2. ไปที่แท็บ "สรุปข้อมูล"
3. ตรวจสอบว่าข้อมูลแสดงในตารางและกราฟ

---

## 🚀 Deploy บน Vercel

### ขั้นตอนที่ 1: Push Code ไป GitHub

```bash
git init
git add .
git commit -m "Initial commit: PJ Poultry System"
git branch -M main
git remote add origin https://github.com/USERNAME/pj-poultry-system.git
git push -u origin main
```

### ขั้นตอนที่ 2: Deploy บน Vercel

1. ไปที่ https://vercel.com
2. Login ด้วย GitHub
3. คลิก "Add New..." → "Project"
4. เลือก repository `pj-poultry-system`
5. กด "Import"

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables

ในหน้า Project Settings:

1. ไปที่ "Environment Variables"
2. เพิ่ม:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://xxxxx.supabase.co`
   - Environment: เลือกทั้ง 3 (Production, Preview, Development)

3. เพิ่ม:
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGci...`
   - Environment: เลือกทั้ง 3

4. คลิก "Save"

### ขั้นตอนที่ 4: Deploy

1. คลิก "Deploy"
2. รอประมาณ 2-3 นาที
3. เสร็จแล้วจะได้ URL เช่น `https://pj-poultry-system.vercel.app`

---

## 🔧 การแก้ไขและปรับแต่ง

### เปลี่ยนชื่อฟาร์ม
แก้ไขในไฟล์เหล่านี้:
- `app/page.tsx` (หน้า Login)
- `app/layout.tsx` (Title)
- `README.md`

### เพิ่มจำนวนเล้า
1. แก้ไข SQL schema: เปลี่ยน `CHECK (house_number BETWEEN 1 AND 7)` เป็นจำนวนที่ต้องการ
2. แก้ไข `app/admin/page.tsx`: เปลี่ยน loop `[1,2,3,4,5,6,7]` เป็นจำนวนที่ต้องการ
3. แก้ไขสี line chart ในส่วน `<Line>` components

### เพิ่มฟิลด์บันทึก
1. เพิ่ม column ในตาราง `daily_records`
2. เพิ่ม field ใน TypeScript types (`app/types/index.ts`)
3. เพิ่ม input ในหน้า Worker (`app/worker/page.tsx`)
4. แก้ไขตารางสรุปในหน้า Admin (`app/admin/page.tsx`)

---

## 🐛 Troubleshooting

### Error: Invalid API Key
- ตรวจสอบ `.env.local` ว่าค่าถูกต้อง
- Restart development server (`Ctrl+C` แล้ว `npm run dev` ใหม่)

### Error: relation "users" does not exist
- ยังไม่ได้รัน SQL schema
- ไปรันที่ Supabase SQL Editor

### หน้าจอขาว / Error 500
- เปิด Browser Console (F12) ดู error
- ตรวจสอบ Network tab ว่า API call ไป Supabase สำเร็จหรือไม่

### Login ไม่ได้
- ตรวจสอบว่ามี user ในตาราง users (ดูที่ Supabase Table Editor)
- ตรวจสอบ password matching logic ใน `app/lib/supabase.ts`

### กราฟไม่แสดง
- ต้องมี active batch และมีข้อมูลใน daily_records อย่างน้อย 1 record
- ตรวจสอบ Console ว่ามี error จาก Recharts หรือไม่

### RLS Policy ไม่ทำงาน
- ตรวจสอบว่า RLS เปิดอยู่ (`ENABLE ROW LEVEL SECURITY`)
- ตรวจสอบ policies ว่าเขียนถูกต้อง
- ลอง disable RLS ชั่วคราวเพื่อทดสอบ (ไม่แนะนำใน production)

---

## 📊 ตัวอย่างข้อมูล

### สร้างข้อมูลทดสอบ

```sql
-- สร้างรุ่นทดสอบ
INSERT INTO batches (batch_name, start_date, is_active) 
VALUES ('รุ่นทดสอบ 2024-01', '2024-01-01', true);

-- สร้างข้อมูลตัวอย่าง (แทนที่ batch_id ด้วย UUID ที่ได้จากข้างบน)
INSERT INTO daily_records 
(batch_id, house_number, record_date, morning_dead, morning_culled, afternoon_dead, afternoon_culled)
VALUES 
('your-batch-uuid', 1, '2024-01-01', 5, 2, 3, 1),
('your-batch-uuid', 2, '2024-01-01', 4, 1, 2, 0),
('your-batch-uuid', 3, '2024-01-01', 6, 3, 4, 2),
('your-batch-uuid', 1, '2024-01-02', 3, 1, 2, 1),
('your-batch-uuid', 2, '2024-01-02', 5, 2, 1, 0);
```

---

## 🔐 Security Best Practices

### สำหรับ Production

1. **ใช้ Supabase Auth**
   - ไม่เก็บรหัสผ่านเอง
   - ใช้ Supabase built-in authentication

2. **เปิดใช้ HTTPS เท่านั้น**
   - Vercel จัดการให้อัตโนมัติ

3. **ตั้งค่า RLS อย่างเข้มงวด**
   - ตรวจสอบ policies ทุกตาราง

4. **Backup ข้อมูลสม่ำเสมอ**
   - ใช้ Supabase Backup feature
   - Export ข้อมูลเป็น CSV เป็นประจำ

5. **Monitor การใช้งาน**
   - ตรวจสอบ logs ใน Supabase
   - ตั้ง alerts สำหรับ errors

---

## 📞 ติดต่อและสนับสนุน

หากมีปัญหาหรือข้อสงสัย:
- ตรวจสอบ README.md
- ดูที่ SETUP_GUIDE.md (ไฟล์นี้)
- ติดต่อผู้พัฒนา: พิชชาพัฒน์ นีลวัฒนานนท์

---

สร้างเมื่อ: 2024
อัพเดทล่าสุด: 2024
