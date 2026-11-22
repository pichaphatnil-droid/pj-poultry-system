"use client";

import { useEffect, useRef, useState } from "react";

// ปุ่ม "ดาวน์โหลด ▾" ใช้ร่วมกันทุกแท็บ (แทนปุ่ม Export หลายปุ่ม)

export interface ExportOption {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean; // กำลังสร้างไฟล์อยู่
}

export default function ExportMenu({
  options,
  tone = "light",
}: {
  options: ExportOption[];
  tone?: "light" | "onColor"; // onColor = วางบนพื้นสี (หัวการ์ดสีม่วง ฯลฯ)
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const busy = options.some((o) => o.busy);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" data-html2canvas-ignore="true">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
          tone === "onColor"
            ? "bg-white/95 text-gray-800 hover:bg-white"
            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {busy ? "⏳ กำลังสร้างไฟล์..." : "⬇️ ดาวน์โหลด"}
        {!busy && <span className="text-xs">▾</span>}
      </button>

      {open && !busy && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                setOpen(false);
                option.onClick();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="w-5 text-center">{option.icon ?? "📄"}</span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
