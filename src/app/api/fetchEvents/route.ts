import { google } from "googleapis";
import { NextResponse } from "next/server"; // ✅ NextResponse をインポート

const SHEET_ID = process.env.SHEET_ID || ""; // ✅ `undefined` の場合、空文字にする

if (!SHEET_ID) {
  throw new Error("❌ SHEET_ID が定義されていません！.env.local を確認してください。");
}


export async function GET() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: "service_account",
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // 🔹 改行コードを適切に処理
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
      
  
      const sheets = google.sheets({ version: "v4", auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "Timesheet!A:J",
      });
  
      const rows = response.data.values || [];
      const events = rows.map(([userId, start, end, engagement, activity, location, details]) => ({
        userId,
        start,
        end,
        engagement,
        activity,
        location,
        details,
      }));
  
      return NextResponse.json(events);
  } catch (error) {
    console.error("❌ Google Sheets API エラー:", error); // ✅ エラーログを出力
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  }
  