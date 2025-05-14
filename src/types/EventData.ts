export interface EventData {
  id: string;          // DataId (スプレッドシートのA列)
  userId: string;      // ユーザーID (スプレッドシートのC列)
  userName?: string; //  User_Name(スプレッドシートのD列)
  start: string;       // 開始時刻 (スプレッドシートのE列)
  end: string;         // 終了時刻 (スプレッドシートのF列)
  engagement: string;  // エンゲージメント (G列)
  activity: string;    // アクティビティ (H列)
  location: string;    // ロケーション (I列)
  details: string;     // 詳細 (J列)
}


  