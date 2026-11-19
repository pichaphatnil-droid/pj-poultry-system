"use client";

import { useAdmin } from "../AdminContext";

export default function NoBatchNotice() {
  const {

  } = useAdmin();

  return (
    <div className="text-center bg-white p-12 rounded-lg shadow-sm">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              ยังไม่มีรุ่นใดในระบบ
            </h3>
            <p className="text-gray-500 mb-6">
              กรุณาสร้างรุ่นใหม่ในเมนู "จัดการรุ่น"
            </p>
          </div>
  );
}
