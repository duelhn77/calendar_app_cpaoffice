"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { DateSelectArg, EventClickArg ,EventDropArg } from "@fullcalendar/core";
import { EventData } from "@/types/EventData";
import { Modal } from "@/components/Modal";
import Sidebar from "@/components/Sidebar";
import {  EventResizeDoneArg } from "@fullcalendar/interaction"; 
import "@/styles/calendar.css"; 
import BudgetReportPage from "../budget-report/page"; // 🔹レポート画面
import UserReportPage from "../user-report/page";
import UserMonthlyDashboard from "../user-monthly-dashboard/page";

export default function CalendarPage() {
  // const [isAuthenticated, setIsAuthenticated] = useState(
  //   typeof window !== "undefined" && localStorage.getItem("isAuthenticated") === "true"
  // );
  // const handleLogout = () => {

  const router = useRouter();
  const [currentView, setCurrentView] = useState<"calendar" | "report" | "user-report" | "dashboard">("calendar");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [events, setEvents] = useState([]);
  const [engagements, setEngagements] = useState<{ name: string; color: string }[]>([]);

  // ✅ Google Sheets から予定データを取得
  const fetchEventsFromSheets = async () => {
    try {
      const userId = localStorage.getItem("userId") || "";
      if (!userId) {
        console.error("❌ ユーザーIDが取得できませんでした");
        return;
      }

      const response = await fetch(`/api/getEvents?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error("スプレッドシートのデータ取得に失敗");

      const data = await response.json();
      console.log("✅ /api/getEvents のレスポンス:", data);

      
      setEvents(
        data
          .filter((event: EventData) => event.userId === userId) // ✅ ログインユーザーのデータのみ取得
          .map((event: EventData) => {
            const engagement = engagements.find((e) => e.name === event.engagement) || { color: "#3788d8" };
            return{
              id: event.id, // DataId
              title: `${event.engagement} - ${event.activity}`,
              start: new Date(event.start),
              end: new Date(event.end),
              backgroundColor: engagement?.color || "#3788d8", // ✅ スプレッドシートの色を適用
              borderColor: engagement?.color || "#3788d8",
              extendedProps: {
                details: `${event.location} / ${event.details}`,
              },
            };
          })
      );
    } catch (error) {
      console.error("❌ スプレッドシートからのデータ取得エラー:", error);
    }
  };

  

  // ✅ 予定をスプレッドシートに保存
  const handleAddEvent = async (data: EventData): Promise<void> => {
    if (!selectedRange) {
      console.error("❌ 選択された範囲がありません！");
      return;
    }

    try {
      const userId = localStorage.getItem("userId") || "";
      const userName = localStorage.getItem("userName") || "Unknown";
      const response = await fetch("/api/saveEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEvent?.id || "",
          userId,
          userName,
          start: selectedRange.start.toISOString(),
          end: selectedRange.end.toISOString(),
          engagement: data.engagement,
          activity: data.activity,
          location: data.location,
          details: data.details,
        }),
      });

      if (!response.ok) throw new Error("スプレッドシートへの保存に失敗");

      console.log("✅ スプレッドシートに保存完了");
      fetchEventsFromSheets();
      setIsOpen(false);
    } catch (error) {
      console.error("❌ スプレッドシートへの保存エラー:", error);
    }
  };

  // ✅ 予定をスプレッドシートで更新
  const handleUpdateEvent = async (data: EventData, range: { start: Date; end: Date } | null): Promise<void> => {
    if (!range || !selectedEvent) {
      console.error("❌ 更新する範囲またはイベントが未定義です！");
      return;
    }

    try {
      const response = await fetch("/api/updateEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEvent.id, // DataId を使用
          start: range.start.toISOString(),
          end: range.end.toISOString(),
          engagement: data.engagement,
          activity: data.activity,
          location: data.location,
          details: data.details,
        }),
      });

      if (!response.ok) throw new Error("スプレッドシートの更新に失敗");

      console.log("✅ スプレッドシートを更新完了");
      fetchEventsFromSheets();
      setIsOpen(false);
    } catch (error) {
      console.error("❌ スプレッドシートの更新エラー:", error);
    }
  };

  // ✅ 予定がクリックされたときにホップアップを表示
  const handleEventClick = (clickInfo: EventClickArg) => {
    console.log("📅 クリックされたイベント:", clickInfo.event);
  
    setSelectedEvent({
      id: clickInfo.event.id || "",
      userId: clickInfo.event.extendedProps?.userId || "",
      userName: clickInfo.event.extendedProps?.userName || "Unknown",
      engagement: clickInfo.event.title.split(" - ")[0] || "",
      activity: clickInfo.event.title.split(" - ")[1] || "",
      location: clickInfo.event.extendedProps?.details?.split(" / ")[0] || "",
      details: clickInfo.event.extendedProps?.details?.split(" / ")[1] || "",
      start: clickInfo.event.start?.toISOString() || "",
      end: clickInfo.event.end?.toISOString() || clickInfo.event.start?.toISOString() || "",
    });
  
    // ✅ `null` の場合は `new Date()` を代入して型エラーを回避
    setSelectedRange({
      start: clickInfo.event.start ?? new Date(),
      end: clickInfo.event.end ?? clickInfo.event.start ?? new Date(),
    });
  
    setIsOpen(true);
  };
  
  
  
  
  const handleDeleteEvent = async (id: string): Promise<void> => {
    console.log("🗑️ 削除する予定の ID:", id);
  
    try {
      const response = await fetch("/api/deleteEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }), // ✅ ID を送信
      });
  
      if (!response.ok) {
        throw new Error("スプレッドシートの削除に失敗しました");
      }
  
      console.log("✅ スプレッドシートのデータを削除しました！");
      fetchEventsFromSheets(); // ✅ 削除後に最新のデータを取得
      setIsOpen(false);
    } catch (error) {
      console.error("❌ 削除エラー:", error);
    }
  };
  
  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => {
    console.log("✏️ 予定の時間が変更されました:", resizeInfo.event);
  
    const updatedEvent = {
      id: resizeInfo.event.id,
      start: resizeInfo.event.start ?? new Date(), 
      end: resizeInfo.event.end ?? resizeInfo.event.start ?? new Date(),
      engagement: resizeInfo.event.title.split(" - ")[0] || "",
      activity: resizeInfo.event.title.split(" - ")[1] || "",
      location: resizeInfo.event.extendedProps.details.split(" / ")[0] || "",
      details: resizeInfo.event.extendedProps.details.split(" / ")[1] || "",
    };
  
    try {
      const response = await fetch("/api/updateEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEvent),
      });
  
      if (!response.ok) {
        throw new Error("スプレッドシートの更新に失敗しました");
      }
  
      console.log("✅ スプレッドシートのデータを更新しました");
      fetchEventsFromSheets(); // 🔹 最新のデータを取得
    } catch (error) {
      console.error("❌ スプレッドシートの更新エラー:", error);
    }
  };
  
  const handleEventMove = async (eventDropInfo: EventDropArg) => {
    console.log("📌 予定の移動:", eventDropInfo);
  
    const { event } = eventDropInfo;
    const updatedEvent = {
      id: event.id, // ✅ DataId を取得
      start: eventDropInfo.event.start ?? new Date(),
      end: eventDropInfo.event.end ?? eventDropInfo.event.start ?? new Date(), // end がない場合は start と同じに
    };
  
    console.log("✅ 更新するデータ:", updatedEvent);
  
    try {
      const response = await fetch("/api/updateEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEvent),
      });
  
      if (!response.ok) {
        throw new Error("スプレッドシートの更新に失敗");
      }
  
      console.log("✅ スプレッドシート更新完了");
      fetchEventsFromSheets(); // 🔹 更新後、最新の予定を取得
    } catch (error) {
      console.error("❌ スプレッドシートの更新エラー:", error);
    }
  };

  const handleSelect = (arg: DateSelectArg) => {
    console.log("📅 選択された範囲:", arg.start, arg.end);
    setSelectedRange({ start: arg.start, end: arg.end });
    setSelectedEvent(null);
    setIsOpen(true);
  };



  // ✅ スプレッドシートから Engagement を取得
  const fetchEngagements = async () => {
    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      if (!userId) {
        console.error("❌ ユーザーIDが取得できません！");
        return;
      }
  
      const response = await fetch(`/api/fetchEngagements?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error("エンゲージメントの取得に失敗しました");
  
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error("❌ APIのレスポンスが配列ではありません:", data);
        return;
      }
  
      setEngagements(data);
    } catch (error) {
      console.error("❌ エンゲージメントの取得エラー:", error);
    }
  };
  
    

  // ✅ 初回レンダリング時に fetchEngagements を実行**
  useEffect(() => {
    fetchEngagements();
  }, []); // 🔹 依存配列を `[]` にして初回のみ実行

  // ✅ engagements が更新された後に fetchEventsFromSheets を実行**
  useEffect(() => {
    if (engagements.length > 0) {
      fetchEventsFromSheets();
    }
  }, [engagements]); // 🔹 `engagements` が更新されたときに実行


// ✅ エンゲージメントを取得したあとにイベントも取得
  useEffect(() => {
    if (engagements.length > 0) {
    fetchEventsFromSheets();
  }
  }, [engagements]);


  
 // ✅ 初回読み込み時にスプレッドシートのデータを取得
useEffect(() => {
  if (!localStorage.getItem("isAuthenticated")) {
    router.push("/login");
  } else {
    fetchEngagements();
  }
}, [router]); // 🔹 `router` に依存するよう修正

  return (
    <div style={{ display: "flex" }}>
      <Sidebar onSelectView={setCurrentView}/>
      <div style={{ marginLeft: "220px", padding: "20px", width: "100%" }}>
      {currentView === "calendar" ? (
          <>
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="09:00:00"   // デフォルト表示を 9:00 に
          locale="ja"
          timeZone="Asia/Tokyo"
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          selectable={true}
          editable={true}
          select={handleSelect}
          events={events}
          eventClick={handleEventClick}
          eventDrop={handleEventMove}
          eventResize={handleEventResize}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay",
          }}
          height="900px" // ✅ 高さを固定
          // contentHeight="1000px" // ✅ 自動調整
          // views={{
          //   timeGridWeek: {
          //     slotDuration: "00:15:00", 
          //   },
          //   timeGridDay: {
          //     slotDuration: "00:15:00",
          //   }
          // }}
        />

        {isOpen && (
          <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSubmit={handleAddEvent}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
            selectedRange={selectedRange}
            selectedEvent={selectedEvent}
          />
        )}
      </>
      ) : (
          <>
            
          </>
    )}
     {currentView === "report" && <BudgetReportPage />}
     {currentView === "user-report" && <UserReportPage />}
     {currentView === "dashboard" && <UserMonthlyDashboard />}
      </div>
    </div>
  );
}
