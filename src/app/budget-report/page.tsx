"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  engagement: string;
  activity: string;
  budget: number;
  actual: number;
  activityId: string;
};

export default function BudgetReportPage() {
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState<string>("");
  const [engagements, setEngagements] = useState<string[]>([]);

  useEffect(() => {
    const fetchReportData = async () => {
      const res = await fetch("/api/fetchBudgetAndActuals");
      const data = await res.json();
      setReportData(data);
    };

    const fetchEngagements = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      try {
        const res = await fetch(`/api/fetchEngagements?userId=${userId}`);
        const json = await res.json();
        interface Engagement {
          name: string;
          color: string;
        }
        const names = (json as Engagement[]).map((e) => e.name);
        setEngagements(names);
        // if (names.length > 0) {
        //   setSelectedEngagement(names[0]);
        // }
      } catch (error) {
        console.error("❌ fetchEngagements エラー:", error);
      }
    };

    fetchReportData();
    fetchEngagements();
  }, []);

  // ✅ Activityごとに一意にまとめる（予算時間は重複集計しない）
  const activityMap: { [key: string]: ReportRow } = {};
  reportData.forEach((row) => {
    if (row.engagement !== selectedEngagement) return;
    const key = row.activityId + "_" + row.activity;
    if (!activityMap[key]) {
      activityMap[key] = { ...row };
    } else {
      activityMap[key].actual += row.actual; // 実績は加算
    }
  });

  const filteredData = Object.values(activityMap).sort((a, b) => {
    return a.activityId.localeCompare(b.activityId, "ja", { numeric: true });
  });

  const totalBudget = filteredData.reduce((sum, row) => sum + row.budget, 0);
  const totalActual = filteredData.reduce((sum, row) => sum + row.actual, 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📊 予実レポート</h1>

      <div className="mb-6">
        <label
          className="mr-3 font-semibold text-gray-700"
          style={{ fontSize: "20px" }}
        >
          Engagement（会社）を選択：
        </label>
        <select
          value={selectedEngagement}
          onChange={(e) => setSelectedEngagement(e.target.value)}
          className="border px-3 py-2 rounded-md shadow-sm"
        >
          <option value="">-- 選択してください --</option>
          {engagements.map((eng) => (
            <option key={eng} value={eng}>
              {eng}
            </option>
          ))}
        </select>
      </div>

      {selectedEngagement && (
        <>
          <h2 className="text-xl font-semibold mb-3" style={{ marginTop: "35px" }}>
            「{selectedEngagement}」の予算・実績一覧
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse border">
              <thead
                style={{
                  borderTop: "2px solid black",
                  borderBottom: "2px solid black",
                  fontWeight: "bold",
                  backgroundColor: "#aed4f6",
                }}
              >
                <tr>
                  <th className="border px-4 py-2" style={{ width: "100px" }}>Activity ID</th>
                  <th className="border px-4 py-2" style={{ width: "250px" }}>Activity</th>
                  <th className="border px-4 py-2" style={{ textAlign: "right" }}>予定時間</th>
                  <th className="border px-4 py-2" style={{ textAlign: "right" }}>実績時間</th>
                  <th className="border px-4 py-2" style={{ textAlign: "right" }}>差分</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => {
                  const diff = row.actual - row.budget;
                  return (
                    <tr key={idx}>
                      <td className="border px-4 py-2 text-center">{row.activityId}</td>
                      <td className="border px-4 py-2 text-center">{row.activity}</td>
                      <td className="border px-4 py-2" style={{ width: "120px", textAlign: "right" }}>{row.budget.toFixed(2)} h</td>
                      <td className="border px-4 py-2" style={{ width: "120px", textAlign: "right" }}>{row.actual.toFixed(2)} h</td>
                      <td
                        className="border px-4 py-2 font-bold"
                        style={{
                          width: "120px",
                          textAlign: "right",
                          color: diff > 0 ? "red" : diff < 0 ? "green" : "black",
                        }}
                      >
                        {(diff >= 0 ? "+" : "") + diff.toFixed(2)} h
                      </td>
                    </tr>
                  );
                })}

                {/* ✅ 合計行 */}
                <tr className="bg-gray-100 font-semibold" 
                style={{
                  borderTop: "2px solid black",
                  borderBottom: "2px solid black",
                  fontWeight: "bold",
                  backgroundColor: "#aed4f6",
                }}>
                  <td className="border px-4 py-2"></td>
                  <td className="border px-4 py-2 text-center">合計</td>
                  <td className="border px-4 py-2" style={{ textAlign: "right" }}>{totalBudget.toFixed(2)} h</td>
                  <td className="border px-4 py-2" style={{ textAlign: "right" }}>{totalActual.toFixed(2)} h</td>
                  <td
                    className="border px-4 py-2"
                    style={{
                      textAlign: "right",
                      color:
                        totalActual - totalBudget > 0
                          ? "red"
                          : totalActual - totalBudget < 0
                          ? "green"
                          : "black",
                    }}
                  >
                    {(totalActual - totalBudget >= 0 ? "+" : "") + (totalActual - totalBudget).toFixed(2)} h
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
