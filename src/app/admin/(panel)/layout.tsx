import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { isDbConfigured } from "@/lib/supabase";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Админка", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <div className="admin-bar">
        <div className="container">
          <strong style={{ marginRight: 8 }}>МЦ 71</strong>
          <Link href="/admin">Обзор</Link>
          <Link href="/admin/forms">Формы</Link>
          <Link href="/admin/events">Мероприятия</Link>
          <Link href="/admin/albums">Альбомы</Link>
          <span className="spacer" />
          <Link href="/" target="_blank">Сайт ↗</Link>
          <form action={logout}>
            <button className="btn btn-sm btn-ghost" style={{ color: "inherit", borderColor: "rgba(255,255,255,.25)" }}>Выйти</button>
          </form>
        </div>
      </div>
      <main className="container section" style={{ paddingBottom: 60 }}>
        {!isDbConfigured() && (
          <div className="alert alert-err" style={{ marginBottom: 20 }}>
            База данных не подключена: задайте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в настройках Vercel.
          </div>
        )}
        {children}
      </main>
    </>
  );
}
