# โครงสร้างโปรเจค PJ Poultry System

```
pj-poultry-system/
│
├── app/                          # Next.js App Directory
│   ├── admin/                    # Admin Dashboard
│   │   └── page.tsx             # หน้า Dashboard แอดมิน (ตาราง, กราฟ, จัดการรุ่น, จัดการผู้ใช้)
│   │
│   ├── worker/                   # Worker Dashboard
│   │   └── page.tsx             # หน้า Dashboard พนักงาน (บันทึกข้อมูลเช้า/บ่าย)
│   │
│   ├── components/               # Reusable Components
│   │   ├── Loading.tsx          # Loading spinners
│   │   └── Messages.tsx         # Error/Success/Warning/Info messages
│   │
│   ├── lib/                      # Utility Functions & Config
│   │   ├── supabase.ts          # Supabase client & auth functions
│   │   └── utils.ts             # Helper functions (formatting, calculations)
│   │
│   ├── types/                    # TypeScript Types
│   │   └── index.ts             # Type definitions (User, Batch, DailyRecord)
│   │
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Login page (หน้าแรก)
│
├── public/                       # Static files (รูปภาพ, icons)
│
├── node_modules/                 # Dependencies (ไม่ต้อง commit)
│
├── .env.local                    # Environment variables (ไม่ต้อง commit)
├── .env.local.example           # ตัวอย่าง env file
├── .gitignore                   # Git ignore rules
│
├── middleware.ts                 # Next.js middleware (route protection)
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies & scripts
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── vercel.json                  # Vercel deployment config
│
├── supabase-schema.sql          # Database schema (รัน 1 ครั้งแรก)
├── sample-data.sql              # ข้อมูลตัวอย่างสำหรับทดสอบ
│
├── README.md                     # เอกสารหลักโปรเจค
├── SETUP_GUIDE.md               # คู่มือติดตั้งแบบละเอียด
├── QUICKSTART.md                # เริ่มต้นใช้งานอย่างรวดเร็ว
└── CHANGELOG.md                 # บันทึกการเปลี่ยนแปลง
```

---

## 📄 คำอธิบายไฟล์สำคัญ

### Frontend (Next.js)

#### 🔐 Authentication & Routing
- **app/page.tsx** - หน้า Login (ตรวจสอบ username/password)
- **middleware.ts** - ป้องกัน route ที่ต้อง login

#### 👨‍💼 Admin Pages
- **app/admin/page.tsx** - Dashboard แอดมิน
  - แท็บ "สรุปข้อมูล": ตาราง + กราฟ
  - แท็บ "จัดการรุ่น": สร้าง/ดูรุ่น
  - แท็บ "จัดการผู้ใช้": ดูรายชื่อพนักงาน

#### 👷 Worker Pages
- **app/worker/page.tsx** - Dashboard พนักงาน
  - แท็บ "ช่วงเช้า": บันทึกไก่ตาย/คัด + อุณหภูมิ/ความชื้น/มิเตอร์น้ำ
  - แท็บ "ช่วงบ่าย": บันทึกไก่ตาย/คัด

#### 🧩 Components
- **app/components/Loading.tsx** - Loading spinners
- **app/components/Messages.tsx** - Alert messages

#### 🛠️ Utilities
- **app/lib/supabase.ts** - Supabase client, signIn, signOut, getCurrentUser
- **app/lib/utils.ts** - Helper functions (format date/number, calculations)

#### 📝 Types
- **app/types/index.ts** - TypeScript interfaces (User, Batch, DailyRecord)

---

### Backend (Supabase)

#### 🗄️ Database Schema
- **supabase-schema.sql** - สคริปต์สร้างฐานข้อมูล
  - ตาราง: users, batches, daily_records
  - Views: daily_summary, cumulative_loss
  - RLS Policies: ความปลอดภัย
  - Triggers: auto-update timestamps

#### 📊 Sample Data
- **sample-data.sql** - ข้อมูลตัวอย่าง 7 วัน (ใช้ทดสอบ)

---

### Configuration Files

#### ⚙️ Next.js
- **next.config.js** - Next.js config
- **tsconfig.json** - TypeScript config
- **middleware.ts** - Route protection

#### 🎨 Styling
- **tailwind.config.js** - Tailwind config (colors, theme)
- **postcss.config.js** - PostCSS config
- **app/globals.css** - Global styles

#### 📦 Dependencies
- **package.json** - Dependencies & scripts
  - `npm run dev` - รันในโหมด development
  - `npm run build` - Build สำหรับ production
  - `npm run start` - รัน production server

#### 🚀 Deployment
- **vercel.json** - Vercel deployment config
- **.env.local.example** - ตัวอย่าง environment variables

---

## 🔑 Environment Variables

สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 🗃️ Database Tables

### users
- ผู้ใช้งาน (admin, worker)
- เก็บ username, password_hash, role, house_number

### batches
- รุ่นไก่
- เก็บชื่อรุ่น, วันที่เริ่ม/จบ, สถานะ active

### daily_records
- บันทึกรายวัน
- เก็บข้อมูลเช้า/บ่าย ของแต่ละเล้า แต่ละวัน

---

## 📱 User Flows

### Admin Flow
1. Login → Admin Dashboard
2. สร้างรุ่นใหม่ (แท็บ "จัดการรุ่น")
3. ดูสรุปข้อมูล (แท็บ "สรุปข้อมูล")
   - ตารางรายวัน
   - กราฟการสูญเสียสะสม
4. ดูรายชื่อพนักงาน (แท็บ "จัดการผู้ใช้")

### Worker Flow
1. Login → Worker Dashboard
2. บันทึกข้อมูลช่วงเช้า
3. บันทึกข้อมูลช่วงบ่าย
4. สามารถกรอกช่วงใดก่อนก็ได้

---

## 🔄 Data Flow

```
Worker Input
    ↓
Supabase (daily_records)
    ↓
Admin Dashboard
    ↓
Charts & Tables
```

---

## 🚀 การใช้งาน

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Deploy to Vercel
```bash
git push origin main
# Vercel จะ auto-deploy
```

---

## 📚 เอกสารประกอบ

1. **README.md** - ภาพรวมและคำแนะนำหลัก
2. **SETUP_GUIDE.md** - คู่มือติดตั้งแบบละเอียด
3. **QUICKSTART.md** - เริ่มใช้งานอย่างรวดเร็ว
4. **CHANGELOG.md** - บันทึกการเปลี่ยนแปลง

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Charts:** Recharts
- **Date Handling:** date-fns
- **Deployment:** Vercel

---

พัฒนาโดย: **พิชชาพัฒน์ นีลวัฒนานนท์**
