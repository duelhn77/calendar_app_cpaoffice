"use client";

import { useEffect, useState } from "react";

interface ReportRow {
  userId: string;
  userName: string;
  engagement: string;
  activity: string;
  activityId?: string;
  budget: number;
  actual: number;
  month?: string;
}

export default function UserReportPage() {
  const [data, setData] = useState<ReportRow[]>([]);
  const [engagements, setEngagements] = useState<string[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [viewMode, setViewMode] = useState<"activity" | "month">("activity");

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/fetchUserBudgetActuals");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    };

    const fetchUserEngagements = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const res = await fetch(`/api/fetchEngagements?userId=${userId}`);
        const data = await res.json();
        const engagementNames = Array.isArray(data) 
         ? (data as { name: string; color: string }[]).map((e) => e.name) 
         : [];
        setEngagements(engagementNames);
      } catch (error) {
        console.error("❌ Engagement取得エラー:", error);
      }
    };

    fetchData();
    fetchUserEngagements();
  }, []);

  const filteredUsers = Array.from(
    new Set(
      data
        .filter(row => !selectedEngagement || row.engagement === selectedEngagement)
        .map(d => d.userName)
    )
  );

  const filteredData = selectedEngagement
    ? data.filter(row => {
        const matchEngagement = row.engagement === selectedEngagement;
        const matchUser = selectedUser ? row.userName === selectedUser : true;
        return matchEngagement && matchUser;
      })
    : [];

  const groupedData = viewMode === "month"
  ? Object.values(
      filteredData.reduce((acc, row) => {
        const key = `${row.userName}_${row.engagement}_${row.month}`;
        if (!acc[key]) {
          acc[key] = { ...row, activity: row.month || "", budget: 0, actual: 0 };
        }
        acc[key].budget += row.budget;
        acc[key].actual += row.actual;
        return acc;
      }, {} as { [key: string]: ReportRow })
    ).sort((a, b) => {
      const dateA = new Date(a.month || "1900-01");
      const dateB = new Date(b.month || "1900-01");
      return dateA.getTime() - dateB.getTime();
    })
  : Object.values(
      filteredData.reduce((acc, row) => {
        const key = `${row.userName}_${row.engagement}_${row.activityId}_${row.activity}`;
        if (!acc[key]) {
          acc[key] = { ...row, budget: 0, actual: 0 };
        }
        acc[key].budget += row.budget;
        acc[key].actual += row.actual;
        return acc;
      }, {} as { [key: string]: ReportRow })
    ).sort((a, b) =>
      (a.activityId || "").localeCompare(b.activityId || "", "ja", { numeric: true })
    );


  const totalActual = groupedData.reduce((sum, row) => sum + row.actual, 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-8">👤 ユーザー別実績レポート</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-4xl">
        

        <div className="flex flex-col">
          <label className="mb-2 font-semibold" style={{ fontSize: "20px" }}>Engagement（会社）を選択：</label>
          <select
            value={selectedEngagement}
            onChange={(e) => {
              setSelectedEngagement(e.target.value);
              setSelectedUser("");
            }}
            className="border px-3 py-2 rounded-md shadow-sm"
          >
            <option value="">-- 選択してください --</option>
            {engagements.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 font-semibold" style={{ fontSize: "20px" }}>Userを選択：</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border px-3 py-2 rounded-md shadow-sm"
          >
            <option value="">-- 選択してください --</option>
            {filteredUsers.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-2 font-semibold" style={{ fontSize: "20px" }}>表示モード：</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "activity" | "month")}
            className="border px-3 py-2 rounded-md shadow-sm"
          >
            <option value="activity">アクティビティ別</option>
            <option value="month">月別</option>
          </select>
        </div>
      </div>

      {selectedEngagement && (
        <div className="overflow-x-auto" style={{ marginTop: "30px" }}>
          <table className="min-w-full text-sm border-collapse border table-auto">
            <thead style={{ borderTop: "2px solid black", borderBottom: "2px solid black", fontWeight: "bold", backgroundColor: "#aed4f6" }}>
              <tr>
                <th className="border px-6 py-3">ユーザー</th>
                <th className="border px-6 py-3">Engagement</th>
                {viewMode === "activity" && <th className="border px-6 py-3">Activity ID</th>}
                <th className="border px-6 py-3">{viewMode === "month" ? "月" : "Activity"}</th>
                <th className="border px-6 py-3" style={{ width: "120px", textAlign: "right" }}>実績</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((row, idx) => (
                <tr key={idx} className="align-top">
                  <td className="border px-6 py-2">{row.userName}</td>
                  <td className="border px-6 py-2">{row.engagement}</td>
                  {viewMode === "activity" && <td className="border px-6 py-2">{row.activityId}</td>}
                  <td className="border px-6 py-2">{viewMode === "month" ? row.month : row.activity}</td>
                  <td className="border px-6 py-2" style={{ width: "120px", textAlign: "right" }}>{row.actual.toFixed(2)}h</td>
                </tr>
              ))}

              <tr className="font-bold bg-gray-50" style={{ borderTop: "2px solid black", borderBottom: "2px solid black", fontWeight: "bold", backgroundColor: "#aed4f6" }}>
                <td className="border px-6 py-2 text-center" colSpan={viewMode === "month" ? 3 : 4}>合計</td>
                <td className="border px-6 py-2" style={{ textAlign: "right" }}>{totalActual.toFixed(2)}h</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}