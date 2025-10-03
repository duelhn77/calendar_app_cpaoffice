// src/pages/api/exportTimesheet.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { parse } from "json2csv";

const SHEET_ID = process.env.SHEET_ID || "";

export async function POST(req: Request) {
  try {
    const { startDate, endDate, userId } = await req.json();

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

    // ✅ スプレッドシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "TimeSheet!A:Z",
    });

    const rows = response.data.values || [];
    if (rows.length < 2) throw new Error("データが見つかりません");

    const originalHeaders = rows[0];      // 元ヘッダー
    const dataRows = rows.slice(1);       // 実データ

    // ✅ 「入力日時」を除外したうえで、「日付」「時間」を追加
    const headers = [...originalHeaders.filter(h => h !== "入力日時"), "日付", "時間"];

    // 🔹 必要カラムのインデックス（originalHeadersベースで）
    const userIdIndex = originalHeaders.indexOf("UserID");
    const startIndex  = originalHeaders.indexOf("Start");
    const endIndex    = originalHeaders.indexOf("End");

    if ([userIdIndex, startIndex, endIndex].includes(-1)) {
      throw new Error("必要なカラムがスプレッドシートに見つかりません");
    }

    // ✅ ユーザーIDと期間でフィルタリング
    const filteredRows = dataRows
      .filter(row => {
        const rowUserId = row[userIdIndex] || "";
        const rowStart  = new Date(row[startIndex]);
        const rowEnd    = new Date(row[endIndex]);

        const rowStartDate = rowStart.toISOString().split("T")[0];
        const rowEndDate   = rowEnd.toISOString().split("T")[0];

        const userFilter = userId ? rowUserId === userId : true;
        const dateFilter = rowStartDate >= startDate && rowEndDate <= endDate;

        return userFilter && dateFilter;
      })
      .map(row => {
        const rowStart = new Date(row[startIndex]);
        const rowEnd   = new Date(row[endIndex]);

        // K列：日付
        const formattedDate = rowStart.toISOString().split("T")[0];

        // L列：時間（15分単位に丸めて小数第2位まで）
        const timeDiffMinutes = (rowEnd.getTime() - rowStart.getTime()) / 60000;
        const hours = timeDiffMinutes / 60;
        const roundedTime = Math.round(hours * 4) / 4;
        const roundedTimeStr = roundedTime.toFixed(2);

        // 「入力日時」を除外した形で既存列を並べる
        const baseRow = originalHeaders
          .filter(h => h !== "入力日時")
          .map(h => {
            const i = originalHeaders.indexOf(h);
            return row[i] ?? "";
          });

        // K/L列を追加
        baseRow.push(formattedDate, roundedTimeStr);

        return baseRow;
      });

    if (!filteredRows.length) throw new Error("指定期間のデータがありません");

    // ✅ CSV 出力
    const csvObjects = filteredRows.map(r =>
      Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))
    );

    const csv = parse(csvObjects, { fields: headers, quote: '"', delimiter: "," });
    const utf8Bom = "\ufeff";
    const fileBuffer = Buffer.from(utf8Bom + csv, "utf-8");

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="export_${startDate}_${endDate}.csv"`,
      },
    });
  } catch (error) {
    console.error("❌ エクスポートエラー:", error);
    return NextResponse.json(
      { error: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
