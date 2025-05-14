import { google } from "googleapis";
import { NextResponse } from "next/server";


const SHEET_ID = process.env.SHEET_ID || "";

export async function POST(req: Request) {
  try {
    const { userId, start, end, engagement, activity, location, details } = await req.json();
    const now = new Date();
    now.setHours(now.getHours() + 9); // ✅ JSTに変換
    const formattedNow = now.toISOString().replace("T", " ").substring(0, 19); // ✅ YYYY-MM-DD HH:MM:SS 形式

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

    // ✅ `DataID` を取得し、現在の行数 +1 で設定
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "TimeSheet!A:A", // A列（DataID）を取得
    });

    const existingIds = sheetData.data.values?.slice(1).map(row => parseInt(row[0], 10)).filter(num => !isNaN(num)) || [];
    const newId = existingIds.length > 0 ? (Math.max(...existingIds) + 1).toString() : "1";
    

    // ✅ Users シートから `UserID` に対応する `User_Name` を取得
    const usersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Users!A:E", // A列がUserID、E列がUser_Name
    });
    
    const usersData = usersResponse.data.values || [];
    const userRow = usersData.find(row => row[0] === userId);
    const userName = userRow ? userRow[4] : "Unknown"; 

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "TimeSheet!A:J", // A列（DataID）を追加
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[newId, formattedNow, userId, userName,start, end, engagement, activity, location, details]],
      },
    });

    return NextResponse.json({ message: "Event saved successfully", id: newId });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

