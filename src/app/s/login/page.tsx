import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getHead } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";
import { Shape } from "@/components/Shape";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вход" };
export const dynamic = "force-dynamic";

export default async function HeadLoginPage() {
  if (await getHead()) redirect("/s");
  return (
    <main className="kid-auth">
      <div className="kid-auth-card">
        <div className="kid-auth-top ig-yellow">
          <Shape name="flower" className="ig-tile-shape" size={200} />
          <LogoMark height={48} bg="#16161B" fg="#F4F2EE" />
          <h1>Кабинет старосты</h1>
          <p>Здесь ты отмечаешь, на какие мероприятия ходил твой класс</p>
        </div>
        <LoginForm />
      </div>
      <p className="kid-foot"><Link href="/">На главную</Link> · <Link href="/admin/login">Вход для учителей</Link></p>
    </main>
  );
}
