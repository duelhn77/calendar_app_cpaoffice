// src/app/user-monthly-dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyRow {
  userName: string;
  month: string;
  totalHours: number;
}

export default function UserMonthlyDashboard() {
  const [data, setData] = useState<MonthlyRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/userMonthlySummary");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    };
    fetchData();
  }, []);

  const users = Array.from(new Set(data.map((d) => d.userName)));

  const filteredData = selectedUser
    ? data.filter((d) => d.userName === selectedUser)
    : [];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">📊 ユーザー別・月別ダッシュボード</h1>

      <div className="mb-4">
        <label 
          className="mr-2 font-semibold"
          style={{ fontSize: "20px" }}
        >ユーザー選択：</label>
        <select
          className="border p-2 rounded"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">-- 選択してください --</option>
          {users.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <>
          {/* 📊 グラフ表示 */}
          <div style={{ width: "100%", height: 350 , marginTop: "30px" }}>
            <ResponsiveContainer>
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalHours" fill="#8884d8" name="実績時間 (h)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 📋 テーブル表示 */}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2"style={{ width: "120px", textAlign: "right" }}>ユーザー</th>
                  <th className="border px-4 py-2"style={{ width: "120px", textAlign: "right" }}>月</th>
                  <th className="border px-4 py-2"style={{ width: "120px", textAlign: "right" }}>実績時間</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="border px-4 py-2"style={{ width: "120px", textAlign: "right" }}>{row.userName}</td>
                    <td className="border px-4 py-2"style={{ width: "120px", textAlign: "right" }}>{row.month}</td>
                    <td className="border px-4 py-2"style={{ width: "120px", textAlign: "right" }}>{row.totalHours.toFixed(1)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
