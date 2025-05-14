import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function POST(req: Request) {
    try {
      const { id, start, end, engagement, activity, location, details } = await req.json();
      console.log("📩 受け取ったデータ:", { id, start, end, engagement, activity, location, details });
  
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: "service_account",
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
  
      const sheets = google.sheets({ version: "v4", auth });
  
      // 既存データの行を検索
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "TimeSheet!A:I",
      });
  
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] === id);
  
      if (rowIndex === -1) {
        throw new Error("更新対象のイベントが見つかりません");
      }
  
      console.log(`✅ 行 ${rowIndex + 1} を更新します`);
  
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `TimeSheet!E${rowIndex + 1}:J${rowIndex + 1}`, // Start から Details までを更新
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[start, end, engagement, activity, location, details]],
        },
      });
  
      return NextResponse.json({ message: "Event updated successfully" });
    } catch (error) {
      console.error("❌ Google Sheets API エラー:", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  }
  

