import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// 環境変数のチェック
const SHEET_ID = process.env.SHEET_ID || '';

export const runtime = "nodejs"; // ✅ APIルートのランタイムをNode.jsに設定

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      console.error("❌ userId がリクエストに含まれていません");
      return NextResponse.json({ error: "userId が必要です" }, { status: 400 });
    }

    if (!SHEET_ID || !process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL) {
      console.error("❌ 環境変数が不足しています");
      return NextResponse.json({ error: "環境変数が不足しています" }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ✅ Users シートのヘッダーを取得
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!A1:Z1", // 🔹 ヘッダーのみ取得
    });

    const headers = headersResponse.data.values?.[0] || [];
    const engagementsColumnIndex = headers.indexOf("Engagements"); // 🔹 "Engagements" の列を動的に取得

    if (engagementsColumnIndex === -1) {
      console.error("❌ Usersシートに 'Engagements' 列が存在しません");
      return NextResponse.json({ error: "'Engagements' 列が見つかりません" }, { status: 500 });
    }

    // ✅ Users シートの全データを取得
    const usersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!A:Z",
    });

    const usersData = usersResponse.data.values || [];
    
    // 🔹 userId に該当する行を検索
    const userRow = usersData.find(row => row[0] === userId);
    const userEngagements = userRow ? userRow[engagementsColumnIndex]?.split(",") || [] : [];

    console.log(`✅ ユーザー ${userId} のエンゲージメント:`, userEngagements);

    // ✅ Engagements シートのデータを取得
    const engagementsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Engagements!A2:B', // A列: Engagement名, B列: 色
    });

    const allEngagements = (engagementsResponse.data.values || []).map(row => ({
      name: row[0],
      color: row[1] || "#3788d8",
    }));

    // ✅ `Users` シートの情報と `Engagements` のリストを照合
    const filteredEngagements = allEngagements.filter(eng => userEngagements.includes(eng.name));

    return NextResponse.json(filteredEngagements, { status: 200 });

  } catch (error) {
    console.error("❌ fetchEngagements API エラー:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

