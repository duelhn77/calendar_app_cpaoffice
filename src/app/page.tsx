import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login"); // ✅ ルートを `/login` にリダイレクト
}
