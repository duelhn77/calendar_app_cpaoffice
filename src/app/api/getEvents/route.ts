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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "TimeSheet!A:J", // ✅ A列 (DataId) から I列 (Details) まで取得
    });

    const rows = response.data.values || [];

    // ヘッダーを除外し、適切なオブジェクトに変換
    const formattedData = rows.slice(1).map((row) => ({
      id: row[0],        // DataId
      userId: row[2],    // UserID
      userName: row[3],  // UserName
      start: row[4],     // Start
      end: row[5],       // End
      engagement: row[6],// Engagement
      activity: row[7],  // Activity
      location: row[8],  // Location
      details: row[9],   // Details
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("❌ Google Sheets API エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}



