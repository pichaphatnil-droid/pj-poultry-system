# ระบบบันทึกข้อมูลฟาร์มไก่

ระบบบันทึกข้อมูลไก่ตาย-ไก่คัด สำหรับ **บริษัท พี เจ โพลทรี จำกัด (ฟาร์มรถไฟไก่งาม)**

พัฒนาโดย **พิชชาพัฒน์ นีลวัฒนานนท์**

---

## 🎯 คุณสมบัติหลัก

### สำหรับพนักงาน (Worker)
- ✅ บันทึกข้อมูลไก่ตาย-ไก่คัด 2 ช่วงเวลา (เช้า/บ่าย)
- ✅ บันทึกอุณหภูมิ ความชื้น และมิเตอร์น้ำ (เฉพาะช่วงเช้า)
- ✅ สามารถกรอกข้อมูลส่วนใดก่อนก็ได้
- ✅ แสดงสถานะการบันทึกข้อมูลแต่ละช่วง

### สำหรับแอดมิน (Admin)
- 📊 **ตารางสรุปรายวัน** - แสดงข้อมูลทั้ง 7 เล้า ตั้งแต่วันที่เริ่มรุ่น
- 📈 **กราฟการสูญเสียสะสม** - กราฟเส้น 7 เส้นแสดงการสูญเสียสะสมของแต่ละเล้า
- 👥 **จัดการผู้ใช้** - เพิ่ม/แก้ไข/ลบบัญชีพนักงาน
- 🔄 **จัดการรุ่น** - เริ่มรุ่นใหม่/ดูประวัติรุ่นเก่า
- 📋 **สรุปการสูญเสีย** - รายเล้าและรวมทั้งหมด

---

## 🚀 การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
npm install
# หรือ
yarn install
```

### 2. ตั้งค่า Supabase

#### 2.1 สร้าง Project ใน Supabase
1. ไปที่ [supabase.com](https://supabase.com)
2. สร้าง Project ใหม่
3. คัดลอก Project URL และ Anon Key

#### 2.2 รัน SQL Schema
1. ไปที่ Supabase Dashboard > SQL Editor
2. เปิดไฟล์ `supabase-schema.sql`
3. คัดลอกโค้ดทั้งหมดและรันใน SQL Editor

**สำคัญ:** ในไฟล์ SQL จะมีการสร้าง user ตัวอย่าง คุณต้องแก้ไข `password_hash` ให้เป็นรหัสผ่านที่ hash แล้ว

สำหรับการทดสอบ คุณสามารถใช้รหัสผ่านแบบ plain text ได้ชั่วคราว (ไม่แนะนำใน production)

#### 2.3 สร้างไฟล์ .env.local

```bash
cp .env.local.example .env.local
```

แก้ไขไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. รันโปรเจค

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

### 4. Login ครั้งแรก

**Admin:**
- Username: `admin`
- Password: `admin123` (หรือตามที่คุณตั้ง)

**Worker:**
- Username: `worker1` ถึง `worker7`
- Password: `worker123` (หรือตามที่คุณตั้ง)

---

## 📦 Deploy บน Vercel

### 1. Push โค้ดไปที่ GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### 2. Deploy บน Vercel

1. ไปที่ [vercel.com](https://vercel.com)
2. Import โปรเจคจาก GitHub
3. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. กด Deploy

---

## 🗃️ โครงสร้างฐานข้อมูล

### ตาราง users
- `id` - UUID
- `username` - ชื่อผู้ใช้
- `password_hash` - รหัสผ่านที่ hash แล้ว
- `full_name` - ชื่อ-นามสกุล
- `role` - admin/worker
- `house_number` - เล้าที่รับผิดชอบ (1-7)
- `is_active` - สถานะการใช้งาน

### ตาราง batches
- `id` - UUID
- `batch_name` - ชื่อรุ่น
- `start_date` - วันที่เริ่มรุ่น
- `end_date` - วันที่จบรุ่น
- `initial_count` - จำนวนไก่เริ่มต้น
- `is_active` - รุ่นที่กำลังใช้งาน

### ตาราง daily_records
- `id` - UUID
- `batch_id` - รุ่นที่เกี่ยวข้อง
- `house_number` - หมายเลขเล้า
- `record_date` - วันที่บันทึก
- ข้อมูลช่วงเช้า:
  - `morning_dead` - ไก่ตาย
  - `morning_culled` - ไก่คัด
  - `morning_temp_outside` - อุณหภูมินอกเล้า
  - `morning_temp_inside` - อุณหภูมิในเล้า
  - `morning_humidity` - ความชื้น
  - `morning_water_meter` - มิเตอร์น้ำ
- ข้อมูลช่วงบ่าย:
  - `afternoon_dead` - ไก่ตาย
  - `afternoon_culled` - ไก่คัด

---

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Charts:** Recharts
- **Date:** date-fns
- **Deployment:** Vercel

---

## 📝 การใช้งาน

### สำหรับพนักงาน
1. Login ด้วย username และ password ที่แอดมินสร้างให้
2. เลือกแท็บ "ช่วงเช้า" หรือ "ช่วงบ่าย"
3. กรอกข้อมูล
4. กดปุ่ม "บันทึกข้อมูล"

### สำหรับแอดมิน
1. Login ด้วยบัญชี admin
2. **แท็บสรุปข้อมูล:** ดูตาราง + กราฟการสูญเสีย
3. **แท็บจัดการรุ่น:** สร้างรุ่นใหม่/ดูประวัติรุ่นเก่า
4. **แท็บจัดการผู้ใช้:** ดูรายชื่อพนักงานทั้งหมด

---

## ⚠️ ข้อควรระวัง

1. **Security:** ในเวอร์ชันนี้ใช้การเข้ารหัสรหัสผ่านแบบง่าย สำหรับ production ควรใช้ Supabase Auth แบบเต็มรูปแบบ
2. **RLS Policies:** ตรวจสอบว่า RLS policies ทำงานถูกต้อง
3. **Backup:** สำรองข้อมูลใน Supabase เป็นประจำ

---

## 🐛 การแก้ปัญหา

### ปัญหา: ไม่สามารถ login ได้
- ตรวจสอบว่าตั้งค่า `.env.local` ถูกต้อง
- ตรวจสอบว่ารัน SQL schema แล้ว
- ตรวจสอบใน Supabase Table Editor ว่ามี users อยู่

### ปัญหา: บันทึกข้อมูลไม่ได้
- ตรวจสอบ RLS policies ใน Supabase
- เปิด Browser Console ดู error message
- ตรวจสอบว่ามี active batch แล้ว

### ปัญหา: กราฟไม่แสดง
- ตรวจสอบว่ามีข้อมูลใน daily_records
- ตรวจสอบว่ามี active batch

---

## 📞 ติดต่อ

พัฒนาโดย: **พิชชาพัฒน์ นีลวัฒนานนท์**

---

## 📄 License

© 2024 บริษัท พี เจ โพลทรี จำกัด - สงวนลิขสิทธิ์
