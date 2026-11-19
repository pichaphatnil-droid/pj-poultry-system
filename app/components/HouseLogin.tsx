'use client';

import { useState } from 'react';
import { signInHouse } from '../lib/supabase';
import type { User } from '../types';

const HOUSES = [1, 2, 3, 4, 5, 6, 7];
const MAX_PIN = 6;

interface HouseLoginProps {
  onSuccess: (user: User) => void;
}

// หน้าเข้าระบบของพนักงาน: แตะเลือกเล้า → กดรหัส
export default function HouseLogin({ onSuccess }: HouseLoginProps) {
  const [house, setHouse] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [choices, setChoices] = useState<{ id: string; full_name: string }[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setHouse(null);
    setPin('');
    setChoices(null);
    setError('');
  };

  const submit = async (value: string, userId?: string) => {
    if (!house || value.length < 4 || loading) return;
    setLoading(true);
    setError('');
    const result = await signInHouse(house, value, userId);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      setPin('');
      return;
    }
    if (result.choose) {
      setChoices(result.choose);
      return;
    }
    if (result.user) onSuccess(result.user);
  };

  const pressDigit = (digit: string) => {
    if (loading || pin.length >= MAX_PIN) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === MAX_PIN) submit(next);
  };

  // ขั้นที่ 1: เลือกเล้า
  if (house === null) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 text-center">
          เลือกเล้า
        </h2>
        <p className="text-lg text-gray-500 mb-6 text-center">ເລືອກເລົ້າ</p>
        <div className="grid grid-cols-2 gap-4">
          {HOUSES.map((h) => (
            <button
              key={h}
              onClick={() => setHouse(h)}
              className={`py-6 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg active:scale-[0.97] transition ${
                h === 7 ? 'col-span-2' : ''
              }`}
            >
              <span className="block text-lg font-semibold opacity-90">เล้า / ເລົ້າ</span>
              <span className="block text-5xl font-bold leading-tight">{h}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ขั้นที่ 3 (ถ้ามี): มีพนักงานหลายคนในเล้านี้ ให้เลือกชื่อ
  if (choices) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          เล้า {house} — คุณคือใคร?
        </h2>
        <div className="space-y-3">
          {choices.map((c) => (
            <button
              key={c.id}
              onClick={() => submit(pin, c.id)}
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-green-600 text-white text-2xl font-bold shadow active:scale-[0.98] disabled:opacity-50"
            >
              {c.full_name}
            </button>
          ))}
        </div>
        <button onClick={reset} className="mt-6 w-full py-3 text-lg text-gray-600">
          ← กลับ / ກັບຄືນ
        </button>
      </div>
    );
  }

  // ขั้นที่ 2: กดรหัส
  return (
    <div>
      <div className="text-center mb-4">
        <p className="text-lg text-gray-500">เล้า / ເລົ້າ</p>
        <p className="text-6xl font-bold text-green-700 leading-tight">{house}</p>
        <p className="text-xl font-semibold text-gray-700 mt-2">ใส่รหัส / ໃສ່ລະຫັດ</p>
      </div>

      <div className="flex justify-center gap-3 mb-4 h-6">
        {Array.from({ length: MAX_PIN }).map((_, i) => (
          <span
            key={i}
            className={`w-5 h-5 rounded-full border-2 ${
              i < pin.length ? 'bg-green-600 border-green-600' : 'border-gray-300'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-2xl text-center text-red-700 font-medium text-lg">
          {error}
        </p>
      )}
      {loading && (
        <p className="mb-4 text-center text-lg text-gray-500">กำลังเข้าสู่ระบบ...</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => pressDigit(d)}
            className="py-5 rounded-2xl bg-gray-100 text-3xl font-bold text-gray-800 active:bg-gray-200"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="py-5 rounded-2xl bg-gray-50 text-xl font-semibold text-gray-600 active:bg-gray-200"
        >
          ลบ
        </button>
        <button
          onClick={() => pressDigit('0')}
          className="py-5 rounded-2xl bg-gray-100 text-3xl font-bold text-gray-800 active:bg-gray-200"
        >
          0
        </button>
        <button
          onClick={() => submit(pin)}
          disabled={pin.length < 4 || loading}
          className="py-5 rounded-2xl bg-green-600 text-xl font-bold text-white disabled:opacity-40"
        >
          ตกลง
        </button>
      </div>

      <button onClick={reset} className="mt-5 w-full py-3 text-lg text-gray-600">
        ← เลือกเล้าใหม่ / ເລືອກເລົ້າໃໝ່
      </button>
    </div>
  );
}
