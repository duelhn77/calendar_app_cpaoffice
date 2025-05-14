import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function POST(req: Request) {
    try {
      const { id } = await req.json();
  
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
  
      // スプレッドシートのデータ取得
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "TimeSheet!A:J",
      });
  
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] === id);
  
      if (rowIndex === -1) {
        throw new Error("❌ 削除対象のデータが見つかりません");
      }
  
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: "ROWS",
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        },
      });
  
      return NextResponse.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("❌ Google Sheets API 削除エラー:", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  }
  