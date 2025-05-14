import { google } from "googleapis";
import { NextResponse } from "next/server";

const SHEET_ID = process.env.SHEET_ID || "";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "ユーザーIDが必要です" }, { status: 400 });
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

    // ✅ 1行目のヘッダーを取得し、UserIDとUserRoleの列を特定
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!1:1", // 1行目のヘッダーを取得
    });

    const headers = headerRes.data.values?.[0] || []; // 1行目のデータ
    const userIdColIndex = headers.indexOf("UserID"); // `UserID` の列を特定
    const userRoleColIndex = headers.indexOf("UserRole"); // `UserRole` の列を特定

    if (userIdColIndex === -1 || userRoleColIndex === -1) {
      throw new Error("❌ 'UserID' または 'UserRole' の列が見つかりません！");
    }

    // ✅ Usersシートのデータを取得（A列から最右の列まで）
    const lastColIndex = Math.max(userIdColIndex, userRoleColIndex);
    const lastCol = String.fromCharCode(65 + lastColIndex); // A=65, B=66...

    console.log(`🔹 取得する範囲: Users!A:${lastCol}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `Users!A:${lastCol}`, // 必要な範囲を取得
    });

    const rows = response.data.values || [];

    // ✅ `userId` に一致するユーザーの `UserRole` を取得
    const userRow = rows.find(row => row[userIdColIndex] === userId);

    if (!userRow || !userRow[userRoleColIndex]) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ role: userRow[userRoleColIndex] }, { status: 200 });

  } catch (error) {
    console.error("❌ getUserRole API エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
