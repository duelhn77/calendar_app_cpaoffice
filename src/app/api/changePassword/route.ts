import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function POST(req: Request) {
  try {
    const { userId, currentPassword, newPassword } = await req.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

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

    // 🔹 `Users` シートから `userId` と `Password` を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!A:C", // A列: userId, B列: ユーザー名, C列: Password
    });

    const rows = response.data.values || [];
    const userRowIndex = rows.findIndex((row) => row[0] === userId);

    if (userRowIndex === -1) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const storedPassword = rows[userRowIndex][2]; // C列（3番目）

    if (storedPassword !== currentPassword) {
      return NextResponse.json({ error: "現在のパスワードが間違っています" }, { status: 403 });
    }

    // 🔹 新しいパスワードをスプレッドシートに更新
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Users!C${userRowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newPassword]] },
    });

    return NextResponse.json({ message: "✅ パスワードが変更されました" }, { status: 200 });
  } catch (error) {
    console.error("❌ パスワード変更 API エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
