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
      range: "Activities!A:D", // A:Engagement, B:Activity_id, C:Activity, D:予定時間
    });
    const activityRows = actRes.data.values || [];

    const getActivityMeta = (eng: string, act: string) => {
      const match = activityRows.find(r => r[0] === eng && r[2] === act);
      return {
        id: match?.[1] || "",
        budget: parseFloat(match?.[3] || "0") || 0,
      };
    };

    const result = dataRows.map((row) => {
      const startRaw = row[startIdx];
      const endRaw = row[endIdx];
      const startDate = new Date(startRaw);
      const endDate = new Date(endRaw);

      const diffInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      const actual = Math.round((diffInMinutes / 60) * 10) / 10;
      const month = !isNaN(startDate.getTime()) ? startDate.toISOString().slice(0, 7) : "";

      const engagement = row[engagementIdx];
      const activity = row[activityIdx];
      const meta = getActivityMeta(engagement, activity);

      return {
        userId: row[userIdIdx],
        userName: row[userNameIdx],
        engagement,
        activity,
        budget: meta.budget,
        actual,
        month,
        activityId: meta.id,
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
