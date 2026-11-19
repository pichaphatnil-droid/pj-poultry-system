"use client";

import { useEffect, useState } from "react";
import type { User } from "../types";

interface UsersManagerProps {
  users: User[];
  currentUserId: string | null;
  onChanged: () => Promise<void> | void;
}

const HOUSES = [1, 2, 3, 4, 5, 6, 7];

const callUsersApi = async (method: "POST" | "PATCH", body: object) => {
  const res = await fetch("/api/admin/users", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "ทำรายการไม่สำเร็จ");
  return data;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export default function UsersManager({
  users,
  currentUserId,
  onChanged,
}: UsersManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newHouse, setNewHouse] = useState("");
  const [newPin, setNewPin] = useState("");
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editHouse, setEditHouse] = useState("");
  const [busy, setBusy] = useState(false);
  const [housePinStatus, setHousePinStatus] = useState<Record<number, boolean>>({});
  const [housePinError, setHousePinError] = useState("");
  const [editPinHouse, setEditPinHouse] = useState<number | null>(null);
  const [housePinInput, setHousePinInput] = useState("");

  const loadHousePins = async () => {
    const res = await fetch("/api/admin/house-pins", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setHousePinError(data.error || "โหลดรหัสเล้าไม่สำเร็จ");
      return;
    }
    setHousePinError("");
    setHousePinStatus(
      Object.fromEntries(
        (data.houses || []).map((h: { house_number: number }) => [h.house_number, true]),
      ),
    );
  };

  useEffect(() => {
    loadHousePins();
  }, []);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  const run = async (action: () => Promise<void>, successText: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await onChanged();
      setMessage({ type: "ok", text: successText });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = () =>
    run(async () => {
      await callUsersApi("POST", {
        username: newUsername,
        full_name: newFullName,
        house_number: newHouse,
        pin: newPin,
        role: "worker",
      });
      setShowAddForm(false);
      setNewUsername("");
      setNewFullName("");
      setNewHouse("");
      setNewPin("");
    }, `เพิ่มพนักงานแล้ว — แจ้งพนักงานว่า ชื่อผู้ใช้: ${newUsername}  PIN: ${newPin}`);

  const handleResetPin = (u: User) =>
    run(async () => {
      await callUsersApi("PATCH", { id: u.id, pin: resetPin });
      setResetUserId(null);
      setResetPin("");
    }, `ตั้ง PIN ใหม่ให้ ${u.full_name} แล้ว — PIN ใหม่: ${resetPin}`);

  const handleSaveHousePin = (house: number) =>
    run(async () => {
      const res = await fetch("/api/admin/house-pins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ house, pin: housePinInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setEditPinHouse(null);
      setHousePinInput("");
      await loadHousePins();
    }, `ตั้งรหัสเล้า ${house} เป็น ${housePinInput} แล้ว`);

  const startEdit = (u: User) => {
    setResetUserId(null);
    setEditUserId(u.id);
    setEditUsername(u.username);
    setEditFullName(u.full_name);
    setEditHouse(u.house_number ? String(u.house_number) : "");
    setMessage(null);
  };

  const handleSaveEdit = (u: User) =>
    run(async () => {
      await callUsersApi("PATCH", {
        id: u.id,
        ...(editUsername !== u.username ? { username: editUsername } : {}),
        full_name: editFullName,
        ...(u.role === "worker" ? { house_number: editHouse } : {}),
      });
      setEditUserId(null);
    }, editUsername !== u.username
      ? `บันทึกแล้ว — แจ้ง ${editFullName} ว่าต่อไปให้ใช้ชื่อผู้ใช้ "${editUsername}" (รหัสเดิม)`
      : `บันทึกข้อมูล ${editFullName} แล้ว`);

  const handleToggleActive = (u: User) => {
    if (
      u.is_active &&
      !window.confirm(`ระงับบัญชี ${u.full_name}? พนักงานคนนี้จะเข้าระบบไม่ได้จนกว่าจะเปิดใช้อีกครั้ง`)
    ) {
      return;
    }
    run(
      () => callUsersApi("PATCH", { id: u.id, is_active: !u.is_active }),
      u.is_active ? `ระงับบัญชี ${u.full_name} แล้ว` : `เปิดใช้บัญชี ${u.full_name} แล้ว`,
    );
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">จัดการผู้ใช้</h2>
          <p className="text-sm text-gray-500 mt-1">
            พนักงานลืมรหัส? กด &quot;ตั้ง PIN ใหม่&quot; แล้วบอก PIN ใหม่ให้พนักงาน
          </p>
          <p className="text-sm text-gray-500">
            คนงานสลับเล้า? กด &quot;แก้ไข&quot; แล้วเปลี่ยนเล้า · คนใหม่มาแทน? &quot;ระงับ&quot; คนเก่า แล้ว
            &quot;+ เพิ่มพนักงาน&quot; (ประวัติของคนเก่ายังอยู่ครบ)
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
        >
          {showAddForm ? "ยกเลิก" : "+ เพิ่มพนักงาน"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-4 text-sm font-medium ${
            message.type === "ok"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-5 grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อผู้ใช้ (ใช้ตอน login)
            </label>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.replace(/\s/g, ""))}
              className={inputClass}
              placeholder="เช่น บอล"
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อ-นามสกุล
            </label>
            <input
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เล้า</label>
            <select
              value={newHouse}
              onChange={(e) => setNewHouse(e.target.value)}
              className={inputClass}
            >
              <option value="">เลือกเล้า</option>
              {HOUSES.map((h) => (
                <option key={h} value={h}>
                  เล้า {h}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN (ตัวเลข 4–6 หลัก)
            </label>
            <input
              value={newPin}
              onChange={(e) => setNewPin(onlyDigits(e.target.value))}
              className={`${inputClass} tracking-widest`}
              inputMode="numeric"
              placeholder="เช่น 1234"
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={busy || !newUsername || !newFullName || !newHouse || newPin.length < 4}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-800">รหัสประจำเล้า</h3>
        <p className="text-sm text-gray-500 mb-4">
          พนักงานเข้าระบบโดยแตะเลือกเล้า แล้วใส่รหัสของเล้านั้น ระบบจะเข้าเป็นพนักงานที่ประจำเล้านั้นอยู่
          — สลับเล้ากันแค่กด &quot;แก้ไข&quot; เปลี่ยนเล้าในตารางด้านล่าง ไม่ต้องเปลี่ยนรหัส
        </p>
        {housePinError && (
          <p className="mb-3 text-sm text-red-600">{housePinError}</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {HOUSES.map((h) => {
            const staff = users
              .filter((u) => u.role === "worker" && u.is_active && u.house_number === h)
              .map((u) => u.full_name);
            return (
              <div key={h} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">เล้า {h}</span>
                  {housePinStatus[h] ? (
                    <span className="text-xs font-semibold text-green-700">ตั้งรหัสแล้ว</span>
                  ) : (
                    <span className="text-xs text-amber-700">ใช้รหัสเดิมของพนักงาน</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {staff.length ? staff.join(", ") : "ยังไม่มีพนักงาน"}
                </p>
                {editPinHouse === h ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={housePinInput}
                      onChange={(e) => setHousePinInput(onlyDigits(e.target.value))}
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1 tracking-widest"
                      inputMode="numeric"
                      placeholder="รหัส"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveHousePin(h)}
                      disabled={busy || housePinInput.length < 4}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      บันทึก
                    </button>
                    <button
                      onClick={() => setEditPinHouse(null)}
                      className="px-2 py-1 text-sm text-gray-600"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditPinHouse(h);
                      setHousePinInput("");
                      setMessage(null);
                    }}
                    className="mt-2 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-semibold"
                  >
                    {housePinStatus[h] ? "เปลี่ยนรหัส" : "ตั้งรหัสเล้า"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["ชื่อผู้ใช้", "ชื่อ-นามสกุล", "บทบาท", "เล้า", "สถานะ", ""].map((h, i) => (
                <th
                  key={i}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {editUserId === u.id ? (
                    <input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.replace(/\s/g, ""))}
                      className="w-32 rounded-lg border border-gray-300 px-2 py-1"
                      autoCapitalize="none"
                    />
                  ) : (
                    u.username
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editUserId === u.id ? (
                    <input
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-48 rounded-lg border border-gray-300 px-2 py-1"
                    />
                  ) : (
                    u.full_name
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.role === "admin" ? "ผู้ดูแลระบบ" : "พนักงาน"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editUserId === u.id && u.role === "worker" ? (
                    <select
                      value={editHouse}
                      onChange={(e) => setEditHouse(e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1"
                    >
                      {HOUSES.map((h) => (
                        <option key={h} value={h}>
                          เล้า {h}
                        </option>
                      ))}
                    </select>
                  ) : (
                    u.house_number || "-"
                  )}
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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {editUserId === u.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(u)}
                        disabled={busy || !editFullName.trim() || editUsername.length < 2}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => setEditUserId(null)}
                        className="px-3 py-1 text-gray-600"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : resetUserId === u.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={resetPin}
                        onChange={(e) => setResetPin(onlyDigits(e.target.value))}
                        className="w-28 rounded-lg border border-gray-300 px-2 py-1 tracking-widest"
                        inputMode="numeric"
                        placeholder="PIN ใหม่"
                        autoFocus
                      />
                      <button
                        onClick={() => handleResetPin(u)}
                        disabled={busy || resetPin.length < 4}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => {
                          setResetUserId(null);
                          setResetPin("");
                        }}
                        className="px-3 py-1 text-gray-600"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => {
                          setEditUserId(null);
                          setResetUserId(u.id);
                          setResetPin("");
                          setMessage(null);
                        }}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-semibold"
                      >
                        ตั้ง PIN ใหม่
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={busy}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                        >
                          {u.is_active ? "ระงับ" : "เปิดใช้"}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
