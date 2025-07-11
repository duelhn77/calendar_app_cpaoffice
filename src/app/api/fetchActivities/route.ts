import { google } from "googleapis";
import { NextResponse } from "next/server";

// 環境変数を取得
const SHEET_ID = process.env.SHEET_ID || "";

export const runtime = "nodejs"; // ✅ API ルートのランタイムを Node.js に設定

export async function GET() {
  try {
    // 🔹 認証情報のチェック
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

    const range = "Activities!A:D"; // A列 (Engagement) - C列 (Activity)

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });

    const rows = response.data.values || [];

    if (rows.length < 2) {
      console.error("❌ Activities データが見つかりません");
      return NextResponse.json({ error: "Activities データが見つかりません" }, { status: 404 });
    }

    const activities = rows.slice(1).map(row => ({
      engagement: row[0] || "", // A列
      activity_id: row[1] || "", // B列 (ID)
      activity: row[2] || "", // C列 (Activity 名)
      budget: parseFloat(row[3] || "0") || 0,// ← D列から取得（予定時間）
    }));

    console.log("✅ 取得したアクティビティ:", activities);

    return NextResponse.json(activities, { status: 200 });
  } catch (error) {
    console.error("❌ fetchActivities API エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
