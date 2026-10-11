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
        {isDbConfigured() ? (
          children
        ) : (
          <div className="card stack">
            <h1 style={{ fontSize: "1.6rem" }}>База данных ещё не подключена</h1>
            <p className="muted">Вход выполнен. Чтобы управлять формами, мероприятиями и альбомами, подключите Supabase:</p>
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>Создайте проект на supabase.com (регион Frankfurt).</li>
              <li>SQL Editor → выполните <code>supabase/schema.sql</code>, затем <code>supabase/server_access.sql</code>.</li>
              <li>В Vercel → Settings → Environment Variables добавьте <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code> и <code>SUPABASE_SERVER_SECRET</code> (значение из <code>private.server_secret</code>), затем Redeploy.</li>
            </ol>
          </div>
        )}
      </main>
    </>
  );
}
