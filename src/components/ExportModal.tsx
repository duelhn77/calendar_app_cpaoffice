import React, { useState } from "react";
import Select from "react-select";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (startDate: string, endDate: string, format: string) => Promise<boolean>; // 修正箇所: `Promise<boolean>` を返す
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState("xlsx");
  const [errorMessage, setErrorMessage] = useState(""); // 修正箇所: エラーメッセージ用の state

  if (!isOpen) return null;

  const handleExport = async () => {
    setErrorMessage(""); // 修正箇所: エラーメッセージをリセット

    const success = await onExport(startDate, endDate, format); // 修正箇所: `onExport` の結果を取得
    if (success) {
      onClose(); // 修正箇所: エクスポート成功時にモーダルを閉じる
    } else {
      setErrorMessage("対象期間に該当データはありません"); // 修正箇所: エラー時にメッセージを表示
    }
  };

  return (
    <>
      {/* ✅ オーバーレイを適用 */}
      <div className="export-modal-overlay" onClick={onClose}></div>

      {/* ✅ モーダル本体 */}
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <h2>📥 データをエクスポート</h2>

        <label>開始日</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

        <label>終了日</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <label>ファイル形式</label>
        <Select
          options={[
            { value: "xlsx", label: "Excel (.xlsx)" },
            { value: "csv", label: "CSV (.csv)" }
          ]}
          value={{ value: format, label: format === "xlsx" ? "Excel (.xlsx)" : "CSV (.csv)" }}
          onChange={(selectedOption) => setFormat(selectedOption?.value || "xlsx")} // 修正箇所: 選択されたフォーマットを反映
        />

        {/* 修正箇所: エラーメッセージを赤字で表示 */}
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

        <div className="export-modal-buttons">
          <button className="export-button" onClick={handleExport}>📤 エクスポート</button>
          <button className="export-button cancel" onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </>
  );
};

export default ExportModal;
