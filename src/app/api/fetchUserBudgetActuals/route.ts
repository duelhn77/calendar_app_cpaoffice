// src/pages/api/fetchBudgetAndActuals.ts
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

    // TimeSheetデータの取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "TimeSheet!A:Z",
    });
    const rows = response.data.values || [];
    if (rows.length < 2) throw new Error("データが見つかりません");

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const idx = (name: string) => headers.indexOf(name);

    const userIdIdx = idx("UserID");
    const userNameIdx = idx("User_Name");
    const engagementIdx = idx("Engagement");
    const activityIdx = idx("Activity");
    const startIdx = idx("Start");
    const endIdx = idx("End");

    if ([userIdIdx, userNameIdx, engagementIdx, activityIdx, startIdx, endIdx].includes(-1)) {
      throw new Error("必要なカラムが不足しています");
    }

    // ActivitiesシートからActivity IDと予定時間を取得
    const actRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Activities!A:D", // A:Engagement, B:Activity_id, C:Activity, D:予定時間(時間)
    });
    const activityRows = actRes.data.values || [];

    const toNumber = (v: unknown, fb = 0) => {
      const n = typeof v === "string" ? Number(v) : (typeof v === "number" ? v : NaN);
      return Number.isFinite(n) ? n : fb;
    };

    const getActivityMeta = (eng: string, act: string) => {
      const match = activityRows.find(r => r[0] === eng && r[2] === act);
      const budgetHours = toNumber(match?.[3], 0);
      return {
        id: match?.[1] || "",
        budgetHours,
        budgetCenti: Math.round(budgetHours * 100), // 予定：時間×100 の整数
      };
    };

    const result = dataRows.map((row) => {
      const startRaw = row[startIdx];
      const endRaw = row[endIdx];
      const startDate = new Date(startRaw);
      const endDate = new Date(endRaw);

      // ★ここが肝：まず分の整数にする（秒以下の端数も吸収）
      const minutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));

      const month = !isNaN(startDate.getTime()) ? startDate.toISOString().slice(0, 7) : "";

      const engagement = row[engagementIdx];
      const activity = row[activityIdx];
      const meta = getActivityMeta(engagement, activity);

      // 表示互換用の派生値
      const actualCenti = Math.round((minutes * 100) / 60); // 時間×100 の整数（2桁相当）
      const actual = actualCenti / 100;                     // 小数時間（0.01h精度）

      return {
        userId: row[userIdIdx],
        userName: row[userNameIdx],
        engagement,
        activity,
        month,                         // "YYYY-MM"
        activityId: meta.id,
        budget: meta.budgetHours,      // 互換
        budgetCenti: meta.budgetCenti, // 推奨
        actual,                        // 互換（0.01h生成）
        actualCenti,                   // 推奨：整数（時間×100）
        actualMinutes: minutes,        // 推奨：分（整数）
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ fetchBudgetAndActuals エラー:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
