import Link from "next/link";
import { db } from "@/lib/supabase";
import { requireStaff } from "@/lib/auth";
import { listFormsWithStats } from "@/lib/admin-data";
import { listHeads, listPeriods } from "@/lib/reports";
import { inScope } from "@/lib/people";
import { fmtDeadline } from "@/lib/time";
import { FormFolder } from "@/components/FormFolder";
import { Icon } from "@/components/Icon";
import { Shape } from "@/components/Shape";
import { plural } from "@/components/FormListItem";
import { DeadlineChip } from "@/components/DeadlineChip";

async function reportTile(classes: string[] | null) {
  try {
    return await loadReportTile(classes);
  } catch (e) {
    // таблицы старост ещё не созданы в базе (не выполнен supabase/heads.sql)
    console.error("reportTile", e);
    return "missing" as const;
  }
}

async function loadReportTile(classes: string[] | null) {
  const [periods, heads] = await Promise.all([listPeriods(6), listHeads(classes)]);
  const p = periods.find((x) => x.is_open) ?? periods[0];
  if (!p) return { p: null, total: 0, sent: 0, heads: heads.length };
  const { data } = await db().from("class_reports").select("class_name,status").eq("period_id", p.id);
  const mine = (data ?? []).filter((r) => inScope(classes, r.class_name));
  const total = new Set([...heads.filter((h) => h.is_active).map((h) => h.class_name), ...mine.map((r) => r.class_name)]).size;
  const sent = mine.filter((r) => r.status === "submitted").length;
  return { p, total, sent, heads: heads.length };
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const actor = await requireStaff();
  const p = actor.perms;
  const denied = (await searchParams).denied === "1";
  const [forms, events, albums, rep] = await Promise.all([
    p.includes("forms") ? listFormsWithStats() : null,
    p.includes("events") ? db().from("events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()) : null,
    p.includes("albums") ? db().from("albums").select("id", { count: "exact", head: true }) : null,
    p.includes("reports") || p.includes("heads") ? reportTile(actor.classes) : null,
  ]);
  const total = forms?.forms.reduce((s, f) => s + f.responses, 0) ?? 0;
  const first = actor.role === "owner" ? "" : `, ${actor.name.split(/\s+/).slice(1, 3).join(" ") || actor.name}`;

  return (
    <div className="stack" style={{ gap: 28 }}>
      <header className="adm-head">
        <h1>Здравствуйте{first}</h1>
        <p>{actor.role === "owner" ? "У вас полный доступ." : actor.classes ? `Ваши классы: ${actor.classes.join(", ")}` : "Вам видны все классы."}</p>
      </header>
      {rep === "missing" && (
        <div className="alert alert-err">Раздел старост ещё не подключён к базе. Выполните файл <code>supabase/heads.sql</code> в Supabase → SQL Editor.</div>
      )}
      {denied && <div className="alert alert-err">Этот раздел вам недоступен. Если он нужен — попросите администратора.</div>}

      <div className="ig-bento adm-bento">
        {rep && rep !== "missing" && p.includes("reports") && (
          rep.p ? (
            <Link href={`/admin/reports/${rep.p.id}`} className="ig-tile ig-yellow ig-wide">
              <Shape name="burst" className="ig-tile-shape" size={220} />
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="ig-tile-label">Отчёты старост</span>
                <DeadlineChip deadline={rep.p.deadline} isOpen={rep.p.is_open} />
              </div>
              <h3>{rep.p.title}</h3>
              <div className="adm-progress">
                <b>{rep.sent}<span> / {rep.total}</span></b>
                <span className="bar"><i style={{ width: `${rep.total ? (rep.sent / rep.total) * 100 : 0}%` }} /></span>
              </div>
              <span className="ig-tile-meta">{plural(rep.sent, "класс сдал", "класса сдали", "классов сдали")} · срок {fmtDeadline(rep.p.deadline)}</span>
            </Link>
          ) : null
        )}
        {rep && rep !== "missing" && p.includes("reports") && !rep.p && (
          <Link href="/admin/reports" className="ig-tile ig-yellow ig-wide">
            <Shape name="burst" className="ig-tile-shape" size={220} />
            <span className="ig-tile-label">Отчёты старост</span>
            <h3>Создать отчётный месяц</h3>
            <span className="ig-tile-go">Начать <Icon name="arrowRight" size={18} /></span>
          </Link>
        )}
        {rep && rep !== "missing" && p.includes("heads") && (
          <Link href="/admin/heads" className="ig-tile ig-mint ig-stat">
            <Shape name="flower" className="ig-tile-shape" size={170} />
            <span className="ig-tile-label">Старосты</span>
            <b>{rep.heads}</b>
            <span>{plural(rep.heads, "староста", "старосты", "старост")}</span>
          </Link>
        )}
        {forms && (
          <Link href="/admin/forms" className="ig-tile ig-blue ig-stat">
            <Shape name="petals" className="ig-tile-shape" size={170} />
            <span className="ig-tile-label">Формы</span>
            <b>{total}</b>
            <span>{plural(total, "ответ", "ответа", "ответов")}</span>
          </Link>
        )}
        {events && (
          <Link href="/admin/events" className="ig-tile ig-cream ig-stat">
            <Shape name="star" className="ig-tile-shape" size={170} />
            <span className="ig-tile-label">События</span>
            <b>{events.count ?? "—"}</b>
            <span>впереди</span>
          </Link>
        )}
        {albums && (
          <Link href="/admin/albums" className="ig-tile ig-pink ig-stat">
            <Shape name="ring" className="ig-tile-shape" size={170} />
            <span className="ig-tile-label">Фотоархив</span>
            <b>{albums.count ?? "—"}</b>
            <span>{plural(albums.count ?? 0, "альбом", "альбома", "альбомов")}</span>
          </Link>
        )}
        {actor.role === "owner" && (
          <Link href="/admin/team" className="ig-tile ig-sky ig-wide">
            <Shape name="bolt" className="ig-tile-shape" size={170} />
            <span className="ig-tile-label">Команда</span>
            <h3>Коды доступа</h3>
          </Link>
        )}
      </div>

      {forms && (
        <section>
          <div className="section-head">
            <h2>Формы</h2>
            <Link href="/admin/forms" className="link">Все</Link>
          </div>
          {forms.error && <div className="alert alert-err">Ошибка загрузки: {forms.error.message}</div>}
          {forms.forms.length === 0 ? (
            <div className="empty">Форм пока нет</div>
          ) : (
            <div className="folders">{forms.forms.slice(0, 8).map((f) => <FormFolder key={f.id} f={f} />)}</div>
          )}
        </section>
      )}
    </div>
  );
}
