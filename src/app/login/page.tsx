"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // ✅ ログイン処理
  const handleLogin = async () => {
    setError(""); // ✅ エラーをリセット

    try {
      const res = await fetch("/api/authenticateUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("ログインに失敗しました。");
      }

      const data = await res.json();
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userId", data.userId);

      console.log("✅ ログイン成功: カレンダーに遷移");
      router.push("/calendar"); // ✅ ログイン後にカレンダーに遷移

    } catch (error) {
      setError((error as Error).message);
      console.error("❌ ログインエラー:", error);
    }
  };
  

  // ✅ Enterキーでログインできるようにする
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="login-container">
      <h2>ログイン</h2>
      {error && <p className="error">{error}</p>}
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown} // ✅ エンターキー対応
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown} // ✅ エンターキー対応
      />
      <button onClick={handleLogin}>ログイン</button>
    </div>
  );
}
