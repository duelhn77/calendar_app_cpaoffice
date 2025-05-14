import { google } from "googleapis";
import { NextResponse } from "next/server";
import { parse } from "json2csv";
import ExcelJS from "exceljs";

const SHEET_ID = process.env.SHEET_ID || "";

export async function POST(req: Request) {
  try {
    const { startDate, endDate, format, userId } = await req.json(); // 🔹 `userId` を追加

    console.log("📤 API 受信:", { startDate, endDate, format, userId });

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
      range: "TimeSheet!A:Z", // 🔹 カラム数が変動しても全て取得
    });

    const rows = response.data.values || [];
    console.log("📊 取得データ:", rows.length, "件");

    if (rows.length < 2) throw new Error("データが見つかりません");


    const maxColumns = Math.max(...rows.map(row => row.length)); // 各行の最大列数を取得
    const headers = [...rows[0], "日付", "時間"];   // ✅ ヘッダーを拡張（K列 "日付", L列 "時間" を追加）
    const dataRows = rows.slice(1); // 🔹 実データ

    // 🔹 ヘッダーからカラムのインデックスを取得
    const userIdIndex = headers.indexOf("UserID");
    const startIndex = headers.indexOf("Start");
    const endIndex = headers.indexOf("End");

    if (userIdIndex === -1 || startIndex === -1 || endIndex === -1) {
      throw new Error("必要なカラムがスプレッドシートに見つかりません");
    }

    // ✅ ユーザーIDと期間でフィルタリング
    const filteredData = dataRows
     .filter(row => {
       const rowUserId = row[userIdIndex] || ""; // `UserID` のカラム
       const rowStart = new Date(row[startIndex]); // `Start` のカラム
       const rowEnd = new Date(row[endIndex]);   // `End` のカラム

       const rowStartDate = rowStart.toISOString().split("T")[0];
       const rowEndDate = rowEnd.toISOString().split("T")[0];
      
       const userFilter = userId ? rowUserId === userId : true; // ✅ `userId` が指定されている場合は、そのユーザーのみを抽出
       const dateFilter = rowStartDate >= startDate && rowEndDate <= endDate;

       return userFilter && dateFilter;
     })
     .map(row => {
      const rowStart = new Date(row[startIndex]);
      const rowEnd = new Date(row[endIndex]);

      // 🔹 K列（"日付"）：YYYY-MM-DD の形式
      const formattedDate = rowStart.toISOString().split("T")[0];

      // 🔹 L列（"時間"）：15分単位での時間計算
      const timeDiffMinutes = (rowEnd.getTime() - rowStart.getTime()) / (1000 * 60);
      const timeHours = timeDiffMinutes / 60;
      const roundedTime = Math.round(timeHours * 4) / 4; // 15分単位で丸める


       // ✅ **J列が空白でもK列が適切な位置に入るように調整**
      const newRow = [...row];
      newRow[maxColumns] = formattedDate; // K列（最大列数の次）
      newRow[maxColumns + 1] = roundedTime.toString(); // L列（最大列数+1）

      return newRow;
    });

    console.log("📊 フィルタ後:", filteredData.length, "件");

    if (!filteredData.length) throw new Error("指定期間のデータがありません");

    let fileBuffer;
    let contentType;
    let fileExtension;

    if (format === "csv") {
      // ✅ CSV 形式でエクスポート
      const formattedCsvData = filteredData.map(row => {
        // `headers.length` に揃えて、不足分を空文字で埋める
        const paddedRow = [...row, ...new Array(headers.length - row.length).fill("")];
        return Object.fromEntries(headers.map((header, i) => [header, paddedRow[i] ?? ""]));
      });

      const csv = parse(formattedCsvData, {
        fields: headers,
        quote: '"',
        delimiter: ",",
      });
      
      const utf8Bom = "\ufeff"; // ✅ BOM（Byte Order Mark）を追加
      fileBuffer = Buffer.from(utf8Bom + csv, "utf-8"); // ✅ BOM付きでバッファに変換
      contentType = "text/csv; charset=utf-8"; // ✅ Content-Type でエンコーディング指定
      fileExtension = "csv";
    } else {
      // ✅ Excel 形式でエクスポート
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Exported Data");

      worksheet.addRow(headers);
      filteredData.forEach(row => worksheet.addRow(row));

      fileBuffer = await workbook.xlsx.writeBuffer();
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileExtension = "xlsx";
    }

    console.log("📂 ファイル生成完了: export." + fileExtension);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="export_${startDate}_${endDate}.${fileExtension}"`,
      },
    });
  } catch (error) {
    console.error("❌ エクスポートエラー:", error);
    return NextResponse.json({ 
      error: (error as Error).message, 
      stack: (error as Error).stack
    }, { status: 500 });
  }
}

