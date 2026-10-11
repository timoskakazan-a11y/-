import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { isDbConfigured } from "@/lib/supabase";
import { logout } from "../actions";
import { AdminNav, AdminTabbar } from "@/components/AdminNav";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Админка", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="admin-top">
        <div className="container">
          <Link href="/admin" aria-label="Редакция инициативной группы">
            <Logo title="Редакция" sub="Инициативная группа 71" />
          </Link>
          <AdminNav />
          <span className="spacer" />
          <Link href="/" target="_blank" className="btn btn-ghost btn-icon" title="Открыть сайт" aria-label="Открыть сайт">
            <Icon name="external" size={18} />
          </Link>
          <form action={logout}>
            <button className="btn btn-ghost btn-icon" title="Выйти" aria-label="Выйти"><Icon name="logout" size={18} /></button>
          </form>
        </div>
      </header>
      <main className="admin-main">
        <div className="container">
          {isDbConfigured() ? (
            children
          ) : (
            <div className="card stack">
              <h1 style={{ fontSize: "1.4rem" }}>База данных ещё не подключена</h1>
              <p className="muted">Вход выполнен. Чтобы управлять формами, событиями и альбомами, подключите Supabase:</p>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>Создайте проект на supabase.com (регион Frankfurt).</li>
                <li>SQL Editor → выполните <code>supabase/schema.sql</code>, затем <code>supabase/server_access.sql</code>.</li>
                <li>В Vercel → Settings → Environment Variables добавьте <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code> и <code>SUPABASE_SERVER_SECRET</code>, затем Redeploy.</li>
              </ol>
            </div>
          )}
        </div>
      </main>
      <AdminTabbar />
    </>
  );
}
