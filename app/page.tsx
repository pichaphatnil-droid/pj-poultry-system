'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from './lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, error } = await signIn(username, password);
      
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }

      if (user) {
        if (user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/worker');
        }
      }
    } catch (err: any) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-lg mb-6">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3 leading-tight">
            บริษัท พี เจ โพลทรี จำกัด
          </h1>
          <p className="text-xl md:text-2xl text-green-700 font-semibold mb-2">
            ฟาร์มรถไฟไก่งาม
          </p>
          <p className="text-base md:text-lg text-gray-600 font-medium">
            ระบบบันทึกข้อมูลฟาร์ม
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 border-2 border-green-100 fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">
            เข้าสู่ระบบ
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium text-base md:text-lg">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-lg md:text-xl font-semibold text-gray-700 mb-3">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 text-lg md:text-xl border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-green-200 focus:border-green-500 outline-none transition-all"
                placeholder="กรอกชื่อผู้ใช้"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-lg md:text-xl font-semibold text-gray-700 mb-3">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 text-lg md:text-xl border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-green-200 focus:border-green-500 outline-none transition-all"
                placeholder="กรอกรหัสผ่าน"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-xl md:text-2xl py-5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm md:text-base text-gray-600 bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 inline-block shadow-sm">
            พัฒนาโดย <span className="font-semibold text-green-700">พิชชาพัฒน์ นีลวัฒนานนท์</span>
          </p>
        </div>
      </div>
    </div>
  );
}