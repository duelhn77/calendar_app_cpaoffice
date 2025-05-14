import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
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

    // ✅ ヘッダー（1行目）を取得して「UserID」「Email」「Password」の列を特定
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!1:1", // 1行目を取得
    });

    const headers = headerRes.data.values?.[0] || []; // 1行目のデータ
    const userIdColIndex = headers.indexOf("UserID"); // UserID の位置
    const emailColIndex = headers.indexOf("Email"); // Email の位置
    const passwordColIndex = headers.indexOf("Password"); // Password の位置

    if (userIdColIndex === -1 || emailColIndex === -1 || passwordColIndex === -1) {
      throw new Error("❌ 'UserID', 'Email', 'Password' のいずれかの列が見つかりません！");
    }

    // ✅ 取得する列範囲を動的に設定
    const lastColIndex = Math.max(userIdColIndex, emailColIndex, passwordColIndex); // 一番右の列
    const lastCol = String.fromCharCode(65 + lastColIndex); // A=65, B=66...

    console.log(`🔹 取得する範囲: Users!A:${lastCol}`);

    // ✅ Users シートの全データを取得（A列から最右列まで）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `Users!A:${lastCol}`,
    });

    const rows = response.data.values || [];

    // ✅ 入力された Email & Password に一致するユーザーを検索
    const userRow = rows.find(row => row[emailColIndex] === email && row[passwordColIndex] === password);

    if (userRow) {
      const userId = userRow[userIdColIndex]; // ✅ ユーザーIDを取得
      return NextResponse.json({ userId });
    } else {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
