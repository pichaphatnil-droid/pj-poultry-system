# 🚀 Quick Start Guide

คู่มือเริ่มต้นใช้งานอย่างรวดเร็ว

---

## ⚡ การติดตั้งด่วน (5 นาที)

### 1. Clone หรือ Download โปรเจค
```bash
# หากมี git
git clone <your-repo-url>
cd pj-poultry-system

# หรือ download ZIP และแตกไฟล์
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. สร้าง Supabase Project
1. ไป https://supabase.com
2. สร้าง Project ใหม่
3. คัดลอก **Project URL** และ **anon key**

### 4. รัน SQL Schema
1. Supabase → SQL Editor
2. คัดลอกโค้ดจาก `supabase-schema.sql`
3. **สำคัญ:** แก้ไขรหัสผ่านก่อนรัน (ดูด้านล่าง)
4. กด Run

#### แก้ไขรหัสผ่านในไฟล์ SQL:
ค้นหาบรรทัด:
```sql
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'ผู้ดูแลระบบ', 'admin');
```

เปลี่ยนเป็น (สำหรับทดสอบ):
```sql
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('admin', 'admin123', 'ผู้ดูแลระบบ', 'admin');
```

ทำแบบเดียวกันกับ worker1-7

**และแก้ไขไฟล์ `app/lib/supabase.ts` บรรทัด 19-24:**
```typescript
// เปลี่ยนจาก
// if (!bcrypt.compareSync(password, data.password_hash)) {

// เป็น
if (data.password_hash !== password) {
  throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
}
```

### 5. สร้างไฟล์ .env.local
```bash
cp .env.local.example .env.local
```

แก้ไข `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 6. รันโปรเจค
```bash
npm run dev
```

เปิด http://localhost:3000

### 7. Login
- **Admin:** `admin` / `admin123`
- **Worker:** `worker1` / `worker123`

---

## 📝 ขั้นตอนแรกหลัง Login (Admin)

1. Login ด้วย admin
2. ไปแท็บ "จัดการรุ่น"
3. คลิก "+ สร้างรุ่นใหม่"
4. กรอกข้อมูล:
   - ชื่อรุ่น: `รุ่น 2024-01`
   - วันที่เริ่ม: เลือกวันนี้
   - จำนวนเริ่มต้น: `50000`
5. คลิก "สร้างรุ่น"

✅ พร้อมใช้งาน!

---

## 🎯 ทดสอบระบบ

### ทดสอบ Worker
1. Logout จาก admin
2. Login: `worker1` / `worker123`
3. แท็บ "ช่วงเช้า":
   - ไก่ตาย: `5`
   - ไก่คัด: `2`
   - อุณหภูมินอกเล้า: `28.5`
   - อุณหภูมิในเล้า: `30.2`
   - ความชื้น: `65`
   - มิเตอร์น้ำ: `1250.50`
4. กด "บันทึกข้อมูล"
5. แท็บ "ช่วงบ่าย":
   - ไก่ตาย: `3`
   - ไก่คัด: `1`
6. กด "บันทึกข้อมูล"

### ตรวจสอบข้อมูล (Admin)
1. Login กลับเข้า admin
2. แท็บ "สรุปข้อมูล"
3. ควรเห็น:
   - ตารางแสดงข้อมูลที่บันทึก
   - กราฟเริ่มแสดงเส้นของเล้า 1

---

## 🚀 Deploy บน Vercel (5 นาที)

### 1. Push ไป GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pj-poultry.git
git push -u origin main
```

### 2. Deploy
1. ไป https://vercel.com
2. Import project จาก GitHub
3. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. กด Deploy

✅ เสร็จแล้ว! ได้ URL เช่น `https://pj-poultry.vercel.app`

---

## 📚 เอกสารเพิ่มเติม

- `README.md` - ภาพรวมโปรเจค
- `SETUP_GUIDE.md` - คำแนะนำแบบละเอียด
- `CHANGELOG.md` - ประวัติการเปลี่ยนแปลง

---

## ❓ คำถามที่พบบ่อย

**Q: Login ไม่ได้**
- ตรวจสอบว่ารัน SQL schema แล้ว
- ตรวจสอบว่าแก้ไขรหัสผ่านแล้ว
- ตรวจสอบ `.env.local`

**Q: ไม่มีรุ่นให้เลือก**
- Admin ต้องสร้างรุ่นก่อน (แท็บ "จัดการรุ่น")

**Q: บันทึกข้อมูลไม่ได้**
- ตรวจสอบว่ามี active batch
- เปิด Console (F12) ดู error

**Q: กราฟไม่แสดง**
- ต้องมีข้อมูลอย่างน้อย 1 วัน
- ตรวจสอบว่ามี batch ที่ active

---

## 🆘 ต้องการความช่วยเหลือ?

1. อ่าน `SETUP_GUIDE.md` แบบละเอียด
2. ตรวจสอบ Console (F12) → Console tab
3. ตรวจสอบ Network tab เพื่อดู API calls
4. ดูตัวอย่าง error ใน issues (GitHub)

---

**Happy Coding! 🎉**

พัฒนาโดย: พิชชาพัฒน์ นีลวัฒนานนท์
