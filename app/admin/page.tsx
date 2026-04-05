'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut, supabase } from '../lib/supabase';
import { getTodayThailand, getNowThailand } from '../lib/dateUtils';
import type { User, Batch, DailyRecord } from '../types';
import { format, differenceInDays, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  record_date: string | null;
  house_number: number | null;
  created_at: string;
  users?: { full_name: string; house_number: number | null };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'chart' | 'logs' | 'users' | 'batches'>('summary');
  const [users, setUsers] = useState<User[]>([]);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchStartDate, setNewBatchStartDate] = useState('');
  const [newBatchInitialCount, setNewBatchInitialCount] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const { data: batchesData } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (batchesData) {
        setAllBatches(batchesData);
        const active = batchesData.find(b => b.is_active);
        setActiveBatch(active || null);

        if (active) {
          const { data: recordsData } = await supabase
            .from('daily_records')
            .select('*')
            .eq('batch_id', active.id)
            .order('record_date', { ascending: true });
          setRecords(recordsData || []);
        }
      }

      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('role', { ascending: false })
        .order('house_number', { ascending: true });
      setUsers(usersData || []);

      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*, users(full_name, house_number)')
        .order('created_at', { ascending: false })
        .limit(100);
      setActivityLogs(logsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
    router.push('/');
  };

  const handleCreateBatch = async () => {
    if (!newBatchName || !newBatchStartDate) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      // ปิดรุ่นเก่าก่อน
      if (activeBatch) {
        await supabase
          .from('batches')
          .update({ is_active: false, end_date: getTodayThailand() })
          .eq('id', activeBatch.id);
      }

      // สร้างรุ่นใหม่
      const { error } = await supabase.from('batches').insert({
        batch_name: newBatchName,
        start_date: newBatchStartDate,
        initial_count: parseInt(newBatchInitialCount) || 0,
        is_active: true,
        created_by: user?.id,
      });

      if (error) throw error;

      alert('สร้างรุ่นใหม่สำเร็จ');
      setShowBatchForm(false);
      setNewBatchName('');
      setNewBatchStartDate('');
      setNewBatchInitialCount('');
      loadData();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const handleCloseBatch = async (batchId: string) => {
    if (!confirm('ต้องการปิดรุ่นนี้หรือไม่?')) return;

    try {
      await supabase
        .from('batches')
        .update({ is_active: false, end_date: getTodayThailand() })
        .eq('id', batchId);

      alert('ปิดรุ่นสำเร็จ');
      loadData();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`ต้องการลบรุ่น "${batchName}" หรือไม่?\n\n⚠️ ข้อมูลทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้!`)) return;

    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      alert('ลบรุ่นสำเร็จ');
      loadData();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const calculateDailySummary = () => {
    if (!activeBatch) return [];

    const startDate = new Date(activeBatch.start_date);
    const today = new Date(getTodayThailand());
    const days = differenceInDays(today, startDate) + 1;
    const summary: any[] = [];

    for (let day = 0; day < days; day++) {
      const currentDate = addDays(startDate, day);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      const dayData: any = {
        day: day + 1,
        date: dateStr,
        dateDisplay: format(currentDate, 'd/M/yyyy'),
        houses: {},
      };

      let dayTotalDead = 0;
      let dayTotalCulled = 0;

      for (let house = 1; house <= 7; house++) {
        const record = records.find(
          r => r.house_number === house && r.record_date === dateStr
        );

        const dead = (record?.morning_dead || 0) + (record?.afternoon_dead || 0);
        const culled = (record?.morning_culled || 0) + (record?.afternoon_culled || 0);

        dayData.houses[house] = { dead, culled, total: dead + culled };
        dayTotalDead += dead;
        dayTotalCulled += culled;
      }

      dayData.totalDead = dayTotalDead;
      dayData.totalCulled = dayTotalCulled;
      dayData.grandTotal = dayTotalDead + dayTotalCulled;
      summary.push(dayData);
    }

    return summary;
  };

  const calculateHouseTotals = (summary: any[]) => {
    const totals: any = {};

    for (let house = 1; house <= 7; house++) {
      let totalDead = 0;
      let totalCulled = 0;

      summary.forEach(day => {
        totalDead += day.houses[house].dead;
        totalCulled += day.houses[house].culled;
      });

      totals[house] = { dead: totalDead, culled: totalCulled, total: totalDead + totalCulled };
    }

    return totals;
  };

  const prepareChartData = () => {
    const dailySummary = calculateDailySummary();
    const todayDate = getTodayThailand();
    // แสดงเฉพาะวันที่ผ่านมาแล้ว (ไม่รวมวันอนาคต)
    // แต่แสดงทุกวันแม้ยังไม่มีข้อมูล (แสดง 0)
    return dailySummary
      .filter(day => day.date <= todayDate)
      .map(day => ({
        date: day.dateDisplay,
        'เล้า 1': day.houses[1].total,
        'เล้า 2': day.houses[2].total,
        'เล้า 3': day.houses[3].total,
        'เล้า 4': day.houses[4].total,
        'เล้า 5': day.houses[5].total,
        'เล้า 6': day.houses[6].total,
        'เล้า 7': day.houses[7].total,
      }));
  };

  const prepareHouseChartData = () => {
    const dailySummary = calculateDailySummary();
    const houseTotals = calculateHouseTotals(dailySummary);
    
    return [1, 2, 3, 4, 5, 6, 7].map(house => ({
      เล้า: `เล้า ${house}`,
      ตาย: houseTotals[house].dead,
      คัด: houseTotals[house].culled,
      รวม: houseTotals[house].total,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const dailySummary = calculateDailySummary();
  const houseTotals = calculateHouseTotals(dailySummary);
  const grandTotalDead = Object.values(houseTotals).reduce((sum: number, h: any) => sum + h.dead, 0);
  const grandTotalCulled = Object.values(houseTotals).reduce((sum: number, h: any) => sum + h.culled, 0);
  const grandTotal = grandTotalDead + grandTotalCulled;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b-2 border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">ระบบจัดการ - แอดมิน</h1>
              <p className="text-sm text-gray-600 mt-1">{user?.full_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-semibold"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ตารางสรุป
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'chart'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              กราฟสรุป
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity Logs
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'batches'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              จัดการรุ่น
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              จัดการผู้ใช้
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'summary' && activeBatch && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 text-lg mb-2">
                สรุปไก่ตาย-ไก่คัดรุ่น {activeBatch.batch_name}
              </h2>
              <p className="text-sm text-blue-700">
                เริ่มวันที่: {format(new Date(activeBatch.start_date), 'dd MMMM yyyy', { locale: th })}
                {' '}(วันที่ {differenceInDays(new Date(getTodayThailand()), new Date(activeBatch.start_date)) + 1})
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full border-collapse" style={{ fontSize: '11px' }}>
                <thead>
                  <tr className="bg-yellow-400 border-b-2 border-black">
                    <th rowSpan={2} className="border border-black px-2 py-2 text-center font-bold">วันที่</th>
                    {[1, 2, 3, 4, 5, 6, 7].map(house => (
                      <th key={house} colSpan={7} className="border border-black px-2 py-1 text-center font-bold">
                        เล้า {house}
                      </th>
                    ))}
                    <th rowSpan={2} className="border border-black px-2 py-2 text-center font-bold bg-yellow-300">รวม</th>
                  </tr>
                  <tr className="bg-yellow-300 border-b-2 border-black">
                    {[1, 2, 3, 4, 5, 6, 7].map(house => (
                      <React.Fragment key={house}>
                        <th className="border border-black px-1 py-1 text-center font-bold">ตาย</th>
                        <th className="border border-black px-1 py-1 text-center font-bold">คัด</th>
                        <th className="border border-black px-1 py-1 text-center font-bold">รวม</th>
                        <th className="border border-black px-1 py-1 text-center font-bold text-xs">อุณหภูมินอก</th>
                        <th className="border border-black px-1 py-1 text-center font-bold text-xs">อุณหภูมิใน</th>
                        <th className="border border-black px-1 py-1 text-center font-bold text-xs">ความชื้น</th>
                        <th className="border border-black px-1 py-1 text-center font-bold text-xs">น้ำ</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailySummary.map((day, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-black px-2 py-1 text-center font-semibold">
                        {day.dateDisplay}
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7].map(house => {
                        const data = day.houses[house];
                        const record = records.find(
                          r => r.house_number === house && r.record_date === day.date
                        );
                        return (
                          <React.Fragment key={house}>
                            <td className="border border-black px-1 py-1 text-center">
                              {data.dead > 0 ? data.dead : ''}
                            </td>
                            <td className="border border-black px-1 py-1 text-center">
                              {data.culled > 0 ? data.culled : ''}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-semibold">
                              {data.total > 0 ? data.total : ''}
                            </td>
                            <td className="border border-black px-1 py-1 text-center text-xs">
                              {record?.morning_temp_outside || '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center text-xs">
                              {record?.morning_temp_inside || '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center text-xs">
                              {record?.morning_humidity || '-'}
                            </td>
                            <td className="border border-black px-1 py-1 text-center text-xs">
                              {record?.morning_water_meter || '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="border border-black px-2 py-1 text-center font-bold bg-yellow-100">
                        {day.grandTotal > 0 ? day.grandTotal : ''}
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="bg-yellow-200 border-t-2 border-black">
                    <td className="border border-black px-2 py-2 text-center font-bold">รวม</td>
                    {[1, 2, 3, 4, 5, 6, 7].map(house => {
                      const data = houseTotals[house];
                      return (
                        <React.Fragment key={house}>
                          <td className="border border-black px-1 py-2 text-center font-bold text-red-700">
                            {data.dead}
                          </td>
                          <td className="border border-black px-1 py-2 text-center font-bold text-orange-700">
                            {data.culled}
                          </td>
                          <td className="border border-black px-1 py-2 text-center font-bold">
                            {data.total}
                          </td>
                          <td colSpan={4} className="border border-black px-1 py-2 text-center text-xs text-gray-400">
                            -
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border border-black px-2 py-2 text-center font-bold text-lg bg-yellow-300">
                      {grandTotal}
                    </td>
                  </tr>

                  <tr className="bg-blue-100">
                    <td className="border border-black px-2 py-2 text-center font-bold">รวมตาย</td>
                    <td colSpan={49} className="border border-black px-2 py-2 text-center font-bold text-red-700">
                      {grandTotalDead}
                    </td>
                  </tr>

                  <tr className="bg-orange-100">
                    <td className="border border-black px-2 py-2 text-center font-bold">รวมคัด</td>
                    <td colSpan={49} className="border border-black px-2 py-2 text-center font-bold text-orange-700">
                      {grandTotalCulled}
                    </td>
                  </tr>

                  <tr className="bg-red-200">
                    <td className="border border-black px-2 py-2 text-center font-bold">รวมตาย/คัด</td>
                    <td colSpan={49} className="border border-black px-2 py-2 text-center font-bold text-lg">
                      {grandTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'chart' && activeBatch && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 text-lg">
                กราฟสรุปรุ่น {activeBatch.batch_name}
              </h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">กราฟแสดงแนวโน้มรายวัน (แยกตามเล้า)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="เล้า 1" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="เล้า 2" stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="เล้า 3" stroke="#eab308" strokeWidth={2} />
                  <Line type="monotone" dataKey="เล้า 4" stroke="#84cc16" strokeWidth={2} />
                  <Line type="monotone" dataKey="เล้า 5" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="เล้า 6" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="เล้า 7" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">สรุปยอดรวมแต่ละเล้า</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={prepareHouseChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="เล้า" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ตาย" fill="#ef4444" />
                  <Bar dataKey="คัด" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(activeTab === 'summary' || activeTab === 'chart') && !activeBatch && (
          <div className="text-center bg-white p-12 rounded-lg shadow-sm">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">ยังไม่มีรุ่นที่เปิดใช้งาน</h3>
            <p className="text-gray-500 mb-6">กรุณาสร้างรุ่นใหม่ในเมนู "จัดการรุ่น"</p>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Activity Logs</h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เวลา</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ใช้</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เล้า</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กิจกรรม</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่บันทึก</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.users?.full_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.house_number || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.record_date ? new Date(log.record_date).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'batches' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">จัดการรุ่น</h2>
              <button
                onClick={() => setShowBatchForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                + สร้างรุ่นใหม่
              </button>
            </div>

            {showBatchForm && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">สร้างรุ่นใหม่</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อรุ่น</label>
                    <input
                      type="text"
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="เช่น รุ่น 3/69"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">วันที่เริ่มรุ่น</label>
                    <input
                      type="date"
                      value={newBatchStartDate}
                      onChange={(e) => setNewBatchStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนเริ่มต้น</label>
                    <input
                      type="number"
                      value={newBatchInitialCount}
                      onChange={(e) => setNewBatchInitialCount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowBatchForm(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCreateBatch}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    สร้างรุ่น
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อรุ่น</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่เริ่ม</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่จบ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {batch.batch_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(batch.start_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.end_date ? format(new Date(batch.end_date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {batch.is_active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            กำลังใช้งาน
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            สิ้นสุดแล้ว
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-3">
                          {batch.is_active && (
                            <button
                              onClick={() => handleCloseBatch(batch.id)}
                              className="text-orange-600 hover:text-orange-900 font-medium"
                            >
                              ปิดรุ่น
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.batch_name)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">จัดการผู้ใช้</h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาท</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เล้า</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.house_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ใช้งาน
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            ระงับ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <div className="text-center py-8 text-sm text-gray-500">
        <p>พัฒนาโดย พิชชาพัฒน์ นีลวัฒนานนท์</p>
      </div>
    </div>
  );
}
