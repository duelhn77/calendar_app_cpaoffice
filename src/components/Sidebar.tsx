import { useState, useEffect, useRef } from "react";
import { FaCog } from "react-icons/fa";
import { useRouter } from "next/navigation";
import ExportModal from "./ExportModal";

export type SidebarView = "calendar" | "report" | "user-report" | "dashboard";

type SidebarProps = {
  onSelectView: (view: SidebarView) => void;
};

export default function Sidebar({ onSelectView }: SidebarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExportMyDataOpen, setIsExportMyDataOpen] = useState(false);
  const [permissions, setPermissions] = useState({
    canExportAll: false,
    canViewReport: false,
    canViewUserReport: false,
    canViewDashboard: false,
  });
  const router = useRouter();

  const reportRef = useRef<HTMLLIElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const res = await fetch(`/api/getUserPermissions?userId=${userId}`);
        const data = await res.json();
        console.log("✅ 権限データ:", data);
        setPermissions(data);
      } catch (error) {
        console.error("❌ 権限取得エラー:", error);
      }
    };

    fetchPermissions();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    router.push("/login");
  };

  const handleChangePassword = () => {
    router.push("/change-password");
  };

  const handleExport = async (startDate: string, endDate: string, format: string, userId?: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/exportData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, format, userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "対象期間に該当データはありません") return false;
        throw new Error("エクスポート処理に失敗しました");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return true;
    } catch (error) {
      console.error("❌ エクスポートエラー:", error);
      return false;
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reportRef.current && !reportRef.current.contains(event.target as Node)) {
        setIsReportOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="sidebar">
      <h1 className="sidebar-title">執務管理システム</h1>
      <ul>
      <li className="report-item" onClick={() => onSelectView("calendar")}>
       <span>🗓️ タイムシート</span>
       <span className="report-arrow"></span>
     </li>
        <li onClick={() => setIsReportOpen(!isReportOpen)} ref={reportRef}>
          <span>📑レポート</span>
          <span className="report-arrow">▶</span>

          {isReportOpen && (
            <div className="menu-popup_report">
              <button
                className="export-button"
                onClick={() => setIsExportMyDataOpen(true)}
              >
                📤 Export（My Data）
              </button>

              {isExportMyDataOpen && (
                <ExportModal
                  isOpen={isExportMyDataOpen}
                  onClose={() => setIsExportMyDataOpen(false)}
                  onExport={async (startDate, endDate, format) => {
                    const userId = localStorage.getItem("userId") || "";
                    return await handleExport(startDate, endDate, format, userId);
                  }}
                />
              )}

              {(permissions.canExportAll || permissions.canViewReport || permissions.canViewUserReport || permissions.canViewDashboard) && (
                <div>
                  {permissions.canExportAll && (
                    <button
                      className="export-button"
                      onClick={() => setIsExportOpen(true)}
                    >
                      📤 Export（all Data）
                    </button>
                  )}

                  {permissions.canViewReport && (
                    <button
                      className="export-button"
                      onClick={() => onSelectView("report")}
                    >
                      📊 予実レポート
                    </button>
                  )}

                  {permissions.canViewUserReport && (
                    <button
                      className="export-button"
                      onClick={() => onSelectView("user-report")}
                    >
                      👤 ユーザー別レポート
                    </button>
                  )}

                  {permissions.canViewDashboard && (
                    <button
                      className="export-button"
                      onClick={() => onSelectView("dashboard")}
                    >
                      📈 ユーザー月次ダッシュボード
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </li>
      </ul>

      {isExportMyDataOpen && (
        <ExportModal
          isOpen={isExportMyDataOpen}
          onClose={() => setIsExportMyDataOpen(false)}
          onExport={async (startDate, endDate, format) => {
            const userId = localStorage.getItem("userId") || "";
            return await handleExport(startDate, endDate, format, userId);
          }}
        />
      )}

      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          onExport={(startDate, endDate, format) => handleExport(startDate, endDate, format)}
        />
      )}

      <div
        className="settings"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        ref={menuRef}
      >
        <FaCog size={20} />
        <span>管理メニュー</span>
        {isMenuOpen && (
          <div className="menu-popup">
            <button className="pw-change-button" onClick={handleChangePassword}>
              🔑 PW変更
            </button>
            <button className="logout-button" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
