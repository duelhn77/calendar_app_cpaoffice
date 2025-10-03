"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyRow {
  userName: string;
  month: string; // YYYY-MM
  totalHours: number;
}

export default function UserMonthlyDashboard() {
  const [data, setData] = useState<MonthlyRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");

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
  const allMonths = Array.from(new Set(data.map((d) => d.month))).sort(
    (a, b) => new Date(a!).getTime() - new Date(b!).getTime()
  );

  const filteredData = selectedUser
    ? data
        .filter((d) => d.userName === selectedUser)
        .filter((d) => {
          const time = new Date(d.month).getTime();
          const from = startMonth ? new Date(startMonth).getTime() : -Infinity;
          const to = endMonth ? new Date(endMonth).getTime() : Infinity;
          return time >= from && time <= to;
        })
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    : [];

  const totalHours = filteredData.reduce((sum, row) => sum + row.totalHours, 0);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">📊 ユーザー別・月別ダッシュボード</h1>

      {/* ユーザーと期間の選択 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        <div>
          <label className="font-semibold block mb-2" style={{ fontSize: "20px" }}>ユーザー選択：</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">-- 選択してください --</option>
            {users.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold block mb-2" style={{ fontSize: "20px" }}>開始月：</label>
          <select
            className="border p-2 rounded w-full"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          >
            <option value="">-- 指定なし --</option>
            {allMonths.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold block mb-2" style={{ fontSize: "20px" }}>終了月：</label>
          <select
            className="border p-2 rounded w-full"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
          >
            <option value="">-- 指定なし --</option>
            {allMonths.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      {/* グラフ */}
      {selectedUser && (
        <>
          <div style={{ width: "100%", height: 350, marginTop: "30px" }}>
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

          {/* テーブル */}
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-6 py-2 text-center">ユーザー</th>
                  <th className="border px-6 py-2 "style={{ textAlign: "right"}}>対象月</th>
                  <th className="border px-6 py-2 "style={{ textAlign: "right"}}>実績時間</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="border px-6 py-2">{row.userName}</td>
                    <td className="border px-6 py-2"style={{ textAlign: "right", width: "120px" }}>{row.month}</td>
                    <td className="border px-6 py-2" style={{ textAlign: "right", width: "120px" }}>{row.totalHours.toFixed(2)} h</td>
                  </tr>
                ))}

                {/* ✅ 合計行 */}
                <tr className="bg-blue-100 font-bold text-right">
                  <td className="border px-6 py-2 text-center" colSpan={2}>合計</td>
                  <td className="border px-6 py-2" style={{ textAlign: "right" }}>{totalHours.toFixed(2)} h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
