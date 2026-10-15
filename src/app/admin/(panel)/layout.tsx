import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import type { NavKey } from "@/components/AdminNav";
import { isDbConfigured } from "@/lib/supabase";
import { logout } from "../actions";
import { AdminNav, AdminTabbar } from "@/components/AdminNav";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Админка", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireStaff();
  const p = actor.perms;
  const keys: NavKey[] = ["home"];
  if (p.includes("reports") || p.includes("heads")) keys.push("heads");
  if (p.includes("forms")) keys.push("forms");
  if (p.includes("events")) keys.push("events");
  if (p.includes("albums")) keys.push("albums");
  if (actor.role === "owner") keys.push("team");
  const headsHref = p.includes("reports") ? "/admin/reports" : "/admin/heads";
  return (
    <div className="adm">
      <header className="admin-top">
        <div className="container">
          <Link href="/admin" aria-label="Редакция инициативной группы">
            <Logo light title={actor.role === "owner" ? "Администратор" : actor.name} sub={actor.role === "owner" ? "Инициативная группа 71" : actor.position || "Инициативная группа 71"} />
          </Link>
          <AdminNav keys={keys} headsHref={headsHref} />
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
      <AdminTabbar keys={keys} headsHref={headsHref} />
    </div>
  );
}
