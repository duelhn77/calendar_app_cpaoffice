import React, { useState } from "react";
import Select from "react-select";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (startDate: string, endDate: string, format: string) => Promise<boolean>;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // ▼ ここを xlsx -> csv に変更
  const [format, setFormat] = useState("csv");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleExport = async () => {
    setErrorMessage("");
    const success = await onExport(startDate, endDate, format);
    if (success) {
      onClose();
    } else {
      setErrorMessage("対象期間に該当データはありません");
    }
  };

  return (
    <>
      <div className="export-modal-overlay" onClick={onClose}></div>

      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <h2>📥 データをエクスポート</h2>

        <label>開始日</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

        <label>終了日</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <label>ファイル形式</label>
        {/* ▼ Excel を除外し、CSV のみ表示 */}
        <Select
          options={[{ value: "csv", label: "CSV (.csv)" }]}
          value={{ value: "csv", label: "CSV (.csv)" }}
          onChange={() => setFormat("csv")}
          isDisabled
        />

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
