import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function GET() {
  try {
    if (!SHEET_ID || !process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL) {
      console.error("❌ 環境変数が不足しています");
      return NextResponse.json({ error: "環境変数が不足しています" }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ✅ 正しいシート名を指定
    const range = "Locations!A2:A";  

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      console.error("❌ Locations データが見つかりません");
      return NextResponse.json({ error: "Locations データが見つかりません" }, { status: 404 });
    }

    // ✅ Location をオブジェクトの配列として返す
    const locations = rows.map(row => ({
      value: row[0], // A列
      label: row[0], // A列
    }));

    console.log("✅ 取得した作業場所:", locations);
    return NextResponse.json(locations, { status: 200 });

  } catch (error) {
    console.error("❌ fetchLocations API エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
