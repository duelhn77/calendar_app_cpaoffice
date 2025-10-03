// src/app/api/fetchBudgetAndActuals/route.ts  ← App Routerならこの配置推奨
// （Pages Routerなら src/pages/api/fetchBudgetAndActuals.ts のままでOK）
import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

// ★ 行データの型（Google Sheets API は基本 string[][] 相当）
type Row = string[];
type Rows = Row[];

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID ?? undefined,
        // ★ 改行エスケープの復元（nullガードも）
        private_key: process.env.GOOGLE_PRIVATE_KEY
          ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
          : undefined,
        client_email: process.env.GOOGLE_CLIENT_EMAIL ?? undefined,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // TimeSheetデータの取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "TimeSheet!A:Z",
    });

    const rows: Rows = (response.data.values ?? []) as Rows;
    if (rows.length < 2) throw new Error("データが見つかりません");

    const headers: Row = rows[0] as Row;
    const dataRows: Rows = rows.slice(1) as Rows;

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
      range: "Activities!A:D", // A:Engagement, B:Activity_id, C:Activity, D:予定時間(時間単位の小数)
    });
    const activityRows: Rows = (actRes.data.values ?? []) as Rows;

    // ★ any を使わず unknown で受けて安全に数値化
    const toNumber = (v: unknown, fb = 0): number => {
      if (typeof v === "number") return Number.isFinite(v) ? v : fb;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : fb;
      }
      return fb;
    };

    const getActivityMeta = (eng: string, act: string) => {
      const match = activityRows.find((r) => r[0] === eng && r[2] === act);
      const budgetHours = toNumber(match?.[3], 0);
      return {
        id: match?.[1] ?? "",
        budgetHours,
        budgetCenti: Math.round(budgetHours * 100), // 予定：時間×100 の整数
      };
    };

    // レコード→分（整数）を計算して返却（丸めはここで初めて分単位に）
    const result = dataRows.map((row) => {
      const startRaw = row[startIdx];
      const endRaw = row[endIdx];
      const startDate = new Date(startRaw);
      const endDate = new Date(endRaw);

      const minutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
      const month = !isNaN(startDate.getTime()) ? startDate.toISOString().slice(0, 7) : "";

      const engagement = row[engagementIdx];
      const activity = row[activityIdx];
      const meta = getActivityMeta(engagement, activity);

      const actualCenti = Math.round((minutes * 100) / 60); // 時間×100 の整数
      const actual = actualCenti / 100;                      // 時間（小数）

      return {
        userId: row[userIdIdx],
        userName: row[userNameIdx],
        engagement,
        activity,
        month,                         // e.g. "2025-05"
        activityId: meta.id,
        budget: meta.budgetHours,      // 旧互換：時間の小数
        budgetCenti: meta.budgetCenti, // 新：時間×100 の整数
        actual,                        // 旧互換：時間の小数
        actualCenti,                   // 新推奨：時間×100 の整数
        actualMinutes: minutes,        // 新推奨：分（整数）
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ fetchBudgetAndActuals エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
