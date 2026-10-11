import Link from "next/link";
import { db } from "@/lib/supabase";
import { listFormsWithStats } from "@/lib/admin-data";
import { FormListItem } from "@/components/FormListItem";

export default async function Dashboard() {
  const [{ forms, error }, events, albums] = await Promise.all([
    listFormsWithStats(),
    db().from("events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()),
    db().from("albums").select("id", { count: "exact", head: true }),
  ]);
  const total = forms.reduce((s, f) => s + f.responses, 0);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><h1>Обзор</h1></div>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      <div className="stats">
        <div className="stat"><b>{total}</b><span>ответов</span></div>
        <Link href="/admin/events" className="stat"><b>{events.count ?? "—"}</b><span>событий впереди</span></Link>
        <Link href="/admin/albums" className="stat"><b>{albums.count ?? "—"}</b><span>альбомов</span></Link>
      </div>
      <div>
        <div className="section-head">
          <h2>Формы</h2>
          <Link href="/admin/forms" className="link">Все</Link>
        </div>
        {forms.length === 0 ? (
          <div className="empty">Форм пока нет. <Link href="/admin/forms" className="link">Создать</Link></div>
        ) : (
          <div className="list">{forms.slice(0, 6).map((f) => <FormListItem key={f.id} f={f} />)}</div>
        )}
      </div>
    </div>
  );
}
