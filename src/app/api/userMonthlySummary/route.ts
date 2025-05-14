// src/app/api/userMonthlySummary/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const timeRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "TimeSheet!A2:J",
    });
    const rows = timeRes.data.values || [];

    // 集計用マップ: { userName + month -> totalHours }
    const summaryMap = new Map<string, { userName: string; month: string; totalHours: number }>();

    for (const row of rows) {
      const userName = row[3]; // D列
      const start = new Date(row[4]); // E列
      const end = new Date(row[5]); // F列
      if (!userName || isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // 時間
      const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      const key = `${userName}__${month}`;

      const prev = summaryMap.get(key);
      summaryMap.set(key, {
        userName,
        month,
        totalHours: (prev?.totalHours || 0) + duration,
      });
    }

    const result = Array.from(summaryMap.values()).map((row) => ({
      ...row,
      totalHours: parseFloat(row.totalHours.toFixed(2))
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ 月別ユーザー実績エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
