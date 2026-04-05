import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบบันทึกข้อมูลฟาร์ม - บริษัท พี เจ โพลทรี จำกัด",
  description: "ระบบบันทึกข้อมูลไก่ตาย-ไก่คัด สำหรับฟาร์มรถไฟไก่งาม",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}