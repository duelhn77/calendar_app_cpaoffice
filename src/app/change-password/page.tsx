"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("すべてのフィールドを入力してください。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("新しいパスワードが一致しません。");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setErrorMessage("ログイン情報がありません。");
      return;
    }

    try {
      const response = await fetch("/api/changePassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "パスワード変更に失敗しました。");
      }

      alert("✅ パスワードが変更されました。");
      router.push("/calendar"); // 成功したらダッシュボードへ遷移
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
      <h2>🔑 パスワード変更</h2>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <label>現在のパスワード:</label>
      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />

      <label>新しいパスワード:</label>
      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

      <label>新しいパスワード（再入力）:</label>
      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

    <div className="button-group">
      <button onClick={handleChangePassword} style={{ marginTop: "10px" }}>変更</button>
      <button className="cancel-button" onClick={() => router.back()}>キャンセル</button>
    </div>

    <style jsx>{`
        .password-change-container {
          display: flex;
          flex-direction: column;
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 10px;
          background-color: #f9f9f9;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
        }
        h2 {
          text-align: center;
        }
        .error-message {
          color: red;
          text-align: center;
        }
        label {
          margin-top: 10px;
        }
        input {
          padding: 10px;
          margin: 5px 0;
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .button-group {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        .change-button {
          background-color: #007bff;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .cancel-button {
          background-color: #ccc;
          color: black;
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .change-button:hover {
          background-color: #0056b3;
        }
        .cancel-button:hover {
          background-color: #aaa;
        }
      `}</style>
    </div>
    
  );
}
