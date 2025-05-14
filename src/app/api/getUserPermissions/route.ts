// /api/getUserPermissions/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

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

    // 1. ヘッダー行を取得して、各列のインデックスを動的に特定する
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!A1:Z1",
    });
    const headers = headerRes.data.values?.[0] || [];

    const colIndex = (name: string) => headers.indexOf(name);

    const userIdIndex = colIndex("UserID");
    const exportAllIndex = colIndex("ExportAll");
    const viewReportIndex = colIndex("ViewReport");
    const viewUserReportIndex = colIndex("ViewUserReport");
    const viewDashboardIndex = colIndex("ViewDashboard");

    if ([userIdIndex, exportAllIndex, viewReportIndex, viewUserReportIndex, viewDashboardIndex].some(idx => idx === -1)) {
      return NextResponse.json({ error: "必要なカラムが見つかりません" }, { status: 500 });
    }

    // 2. 全データを取得して該当ユーザーの行を探す
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!A2:Z",
    });

    const rows = res.data.values || [];
    const row = rows.find(r => r[userIdIndex] === userId);

    if (!row) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const parseBool = (val?: string) => val?.trim().toUpperCase() === "TRUE";

    const permissions = {
      canExportAll: parseBool(row[exportAllIndex]),
      canViewReport: parseBool(row[viewReportIndex]),
      canViewUserReport: parseBool(row[viewUserReportIndex]),
      canViewDashboard: parseBool(row[viewDashboardIndex]),
    };

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("❌ getUserPermissions エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

