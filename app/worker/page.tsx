'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut, supabase } from '../lib/supabase';
import type { User, Batch, DailyRecord } from '../types';
import { getTodayThailand, getNowThailand } from '../lib/dateUtils';

export default function WorkerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
const [selectedDate, setSelectedDate] = useState(getTodayThailand());
  const [todayRecord, setTodayRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'morning' | 'afternoon'>('morning');

  const [morningDead, setMorningDead] = useState('');
  const [morningCulled, setMorningCulled] = useState('');
  const [morningTempOutside, setMorningTempOutside] = useState('');
  const [morningTempInside, setMorningTempInside] = useState('');
  const [morningHumidity, setMorningHumidity] = useState('');
  const [morningWaterMeter, setMorningWaterMeter] = useState('');
  const [afternoonDead, setAfternoonDead] = useState('');
  const [afternoonCulled, setAfternoonCulled] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'worker') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    loadActiveBatch(currentUser);
  }, [router]);

  useEffect(() => {
    if (user && activeBatch) {
      loadRecordForDate(selectedDate);
    }
  }, [selectedDate, user, activeBatch]);

  const loadActiveBatch = async (currentUser: User) => {
    try {
      const { data: batch } = await supabase.from('batches').select('*').eq('is_active', true).single();
      if (batch) {
        setActiveBatch(batch);
      }
    } catch (error) {
      console.error('Error loading batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecordForDate = async (date: string) => {
    if (!user || !activeBatch) return;
    
    try {
      const { data: record } = await supabase.from('daily_records').select('*')
        .eq('batch_id', activeBatch.id)
        .eq('house_number', user.house_number!)
        .eq('record_date', date)
        .single();

      if (record) {
        setTodayRecord(record);
        setMorningDead(record.morning_dead?.toString() || '');
        setMorningCulled(record.morning_culled?.toString() || '');
        setMorningTempOutside(record.morning_temp_outside?.toString() || '');
        setMorningTempInside(record.morning_temp_inside?.toString() || '');
        setMorningHumidity(record.morning_humidity?.toString() || '');
        setMorningWaterMeter(record.morning_water_meter?.toString() || '');
        setAfternoonDead(record.afternoon_dead?.toString() || '');
        setAfternoonCulled(record.afternoon_culled?.toString() || '');
      } else {
        // ไม่มีข้อมูล ให้ clear form
        setTodayRecord(null);
        setMorningDead('');
        setMorningCulled('');
        setMorningTempOutside('');
        setMorningTempInside('');
        setMorningHumidity('');
        setMorningWaterMeter('');
        setAfternoonDead('');
        setAfternoonCulled('');
      }
    } catch (error) {
      // ไม่มีข้อมูล
      setTodayRecord(null);
      setMorningDead('');
      setMorningCulled('');
      setMorningTempOutside('');
      setMorningTempInside('');
      setMorningHumidity('');
      setMorningWaterMeter('');
      setAfternoonDead('');
      setAfternoonCulled('');
    }
  };

  const handleSave = async () => {
    if (!user || !activeBatch) return;
    setSaving(true);
    try {
      const now = getNowThailand();
      const recordData: any = {
        batch_id: activeBatch.id,
        house_number: user.house_number!,
        record_date: selectedDate,
      };

      if (activeTab === 'morning') {
        recordData.morning_dead = parseInt(morningDead) || 0;
        recordData.morning_culled = parseInt(morningCulled) || 0;
        recordData.morning_temp_outside = parseFloat(morningTempOutside) || null;
        recordData.morning_temp_inside = parseFloat(morningTempInside) || null;
        recordData.morning_humidity = parseFloat(morningHumidity) || null;
        recordData.morning_water_meter = parseFloat(morningWaterMeter) || null;
        recordData.morning_recorded_by = user.id;
        recordData.morning_recorded_at = now;
      } else {
        recordData.afternoon_dead = parseInt(afternoonDead) || 0;
        recordData.afternoon_culled = parseInt(afternoonCulled) || 0;
        recordData.afternoon_recorded_by = user.id;
        recordData.afternoon_recorded_at = now;
      }

      const { data, error } = await supabase.from('daily_records')
        .upsert(recordData, { onConflict: 'batch_id,house_number,record_date' }).select().single();
      if (error) throw error;

      // บันทึก activity log
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: activeTab === 'morning' ? 'RECORD_MORNING' : 'RECORD_AFTERNOON',
        description: `บันทึกข้อมูล${activeTab === 'morning' ? 'ช่วงเช้า' : 'ช่วงบ่าย'} เล้า ${user.house_number} วันที่ ${selectedDate}`,
        record_date: selectedDate,
        house_number: user.house_number
      });

      setTodayRecord(data);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => { signOut(); router.push('/'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-xl font-semibold">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!activeBatch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="text-center bg-white p-8 md:p-12 rounded-3xl shadow-2xl max-w-md border-2 border-yellow-200">
          <svg className="w-20 h-20 text-yellow-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">ยังไม่มีรุ่นที่เปิดใช้งาน</h2>
          <p className="text-lg md:text-xl text-gray-600 mb-8">กรุณาติดต่อผู้ดูแลระบบ<br/>เพื่อเริ่มรุ่นใหม่</p>
          <button onClick={handleLogout} className="w-full px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white text-xl font-bold rounded-2xl transition-all shadow-lg">
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <header className="bg-gradient-to-r from-green-600 to-green-700 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{user?.house_number}</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">เล้าที่ {user?.house_number}</h1>
                <p className="text-base md:text-lg text-green-100 font-medium mt-1">{user?.full_name}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition text-base md:text-lg font-semibold backdrop-blur-sm border border-white/30">
              ออก
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl md:rounded-3xl p-5 md:p-6 mb-6 shadow-lg border-2 border-blue-300">
          <div className="flex items-center text-white mb-4">
            <svg className="w-7 h-7 md:w-8 md:h-8 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-bold text-xl md:text-2xl block">รุ่นปัจจุบัน: {activeBatch.batch_name}</span>
              <span className="text-base md:text-lg text-blue-100 mt-1 block">
                เริ่มวันที่: {new Date(activeBatch.start_date).toLocaleDateString('th-TH')}
              </span>
            </div>
          </div>

          {/* Date Picker */}
          <div className="mt-4">
            <label className="block text-white text-lg md:text-xl font-bold mb-3">📅 เลือกวันที่บันทึก:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={activeBatch.start_date}
              max={getTodayThailand()}
              className="w-full px-5 py-4 text-lg md:text-xl font-bold border-2 border-white rounded-2xl focus:ring-4 focus:ring-white/50 outline-none text-gray-800"
            />
          </div>
        </div>

        {showSuccess && (
          <div className="mb-6 p-5 bg-green-100 border-3 border-green-300 rounded-2xl shadow-lg animate-pulse">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-bold text-xl">✓ บันทึกข้อมูลสำเร็จ!</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border-2 border-gray-200">
          <div className="border-b-4 border-gray-200">
            <div className="grid grid-cols-2 gap-0">
              <button onClick={() => setActiveTab('morning')} className={`px-6 py-5 md:py-6 text-center font-bold text-lg md:text-xl transition-all ${activeTab === 'morning' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 md:w-7 md:h-7 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  ช่วงเช้า
                </div>
              </button>
              <button onClick={() => setActiveTab('afternoon')} className={`px-6 py-5 md:py-6 text-center font-bold text-lg md:text-xl transition-all ${activeTab === 'afternoon' ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 md:w-7 md:h-7 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  ช่วงบ่าย
                </div>
              </button>
            </div>
          </div>

          <div className="p-5 md:p-8">
            {activeTab === 'morning' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-5 rounded-2xl border-2 border-red-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">🐔 จำนวนไก่ตาย (ตัว)</label>
                    <input type="number" min="0" value={morningDead} onChange={(e) => setMorningDead(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-red-300 rounded-2xl focus:ring-4 focus:ring-red-300 focus:border-red-500 outline-none text-center bg-white" placeholder="0" />
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-2xl border-2 border-yellow-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">⚠️ จำนวนไก่คัด (ตัว)</label>
                    <input type="number" min="0" value={morningCulled} onChange={(e) => setMorningCulled(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-yellow-300 rounded-2xl focus:ring-4 focus:ring-yellow-300 focus:border-yellow-500 outline-none text-center bg-white" placeholder="0" />
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-5 rounded-2xl border-2 border-blue-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">🌡️ อุณหภูมินอกเล้า (°C)</label>
                    <input type="number" step="0.1" value={morningTempOutside} onChange={(e) => setMorningTempOutside(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-blue-300 rounded-2xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none text-center bg-white" placeholder="25.0" />
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl border-2 border-purple-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">🌡️ อุณหภูมิในเล้า (°C)</label>
                    <input type="number" step="0.1" value={morningTempInside} onChange={(e) => setMorningTempInside(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-purple-300 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none text-center bg-white" placeholder="28.0" />
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-5 rounded-2xl border-2 border-teal-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">💧 ความชื้น (%)</label>
                    <input type="number" step="0.1" min="0" max="100" value={morningHumidity} onChange={(e) => setMorningHumidity(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-teal-300 rounded-2xl focus:ring-4 focus:ring-teal-300 focus:border-teal-500 outline-none text-center bg-white" placeholder="60.0" />
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border-2 border-indigo-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">💦 มิเตอร์น้ำ</label>
                    <input type="number" step="0.01" value={morningWaterMeter} onChange={(e) => setMorningWaterMeter(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-indigo-300 rounded-2xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none text-center bg-white" placeholder="1250.50" />
                  </div>
                </div>

                {todayRecord?.morning_recorded_at && (
                  <div className="bg-green-100 border-3 border-green-300 rounded-2xl p-5 mt-6">
                    <p className="text-lg md:text-xl text-green-800 font-bold flex items-center">
                      <svg className="w-7 h-7 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      บันทึกข้อมูลช่วงเช้าแล้ว เมื่อ {new Date(todayRecord.morning_recorded_at).toLocaleString('th-TH')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-5 rounded-2xl border-2 border-red-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">🐔 จำนวนไก่ตาย (ตัว)</label>
                    <input type="number" min="0" value={afternoonDead} onChange={(e) => setAfternoonDead(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-red-300 rounded-2xl focus:ring-4 focus:ring-red-300 focus:border-red-500 outline-none text-center bg-white" placeholder="0" />
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-2xl border-2 border-yellow-200">
                    <label className="block text-xl md:text-2xl font-bold text-gray-800 mb-3">⚠️ จำนวนไก่คัด (ตัว)</label>
                    <input type="number" min="0" value={afternoonCulled} onChange={(e) => setAfternoonCulled(e.target.value)} className="w-full px-6 py-5 text-2xl md:text-3xl font-bold border-3 border-yellow-300 rounded-2xl focus:ring-4 focus:ring-yellow-300 focus:border-yellow-500 outline-none text-center bg-white" placeholder="0" />
                  </div>
                </div>

                {todayRecord?.afternoon_recorded_at && (
                  <div className="bg-green-100 border-3 border-green-300 rounded-2xl p-5 mt-6">
                    <p className="text-lg md:text-xl text-green-800 font-bold flex items-center">
                      <svg className="w-7 h-7 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      บันทึกข้อมูลช่วงบ่ายแล้ว เมื่อ {new Date(todayRecord.afternoon_recorded_at).toLocaleString('th-TH')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8">
              <button onClick={handleSave} disabled={saving} className={`w-full py-6 rounded-2xl font-bold text-xl md:text-2xl transition-all shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ${activeTab === 'morning' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white' : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}>
                {saving ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังบันทึก...
                  </span>
                ) : (
                  '💾 บันทึกข้อมูล'
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm md:text-base text-gray-600 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 inline-block shadow-sm">
            พัฒนาโดย <span className="font-semibold text-green-700">พิชชาพัฒน์ นีลวัฒนานนท์</span>
          </p>
        </div>
      </main>
    </div>
  );
}