import Link from "next/link";
import { db } from "@/lib/supabase";
import { listFormsWithStats } from "@/lib/admin-data";
import { FormFolder } from "@/components/FormFolder";
import { Icon } from "@/components/Icon";

export default async function Dashboard() {
  const [{ forms, error }, events, albums] = await Promise.all([
    listFormsWithStats(),
    db().from("events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()),
    db().from("albums").select("id", { count: "exact", head: true }),
  ]);
  const total = forms.reduce((s, f) => s + f.responses, 0);

  return (
    <div className="stack" style={{ gap: 28 }}>
      <h1 className="title-xl" style={{ fontSize: 40 }}>Обзор</h1>
      {error && <div className="alert alert-err">Ошибка загрузки: {error.message}</div>}
      <div className="tiles">
        <Link href="/admin/forms" className="tile tile-yellow">
          <div><h3>Ответы</h3><p>во всех формах</p></div>
          <span className="num">{total}</span>
        </Link>
        <Link href="/admin/events" className="tile tile-sky">
          <div><h3>События</h3><p>впереди</p></div>
          <span className="num">{events.count ?? "—"}</span>
        </Link>
        <Link href="/admin/albums" className="tile tile-lilac">
          <div><h3>Альбомы</h3><p>в фотоархиве</p></div>
          <span className="num">{albums.count ?? "—"}</span>
        </Link>
        <Link href="/admin/forms#new" className="tile tile-pink">
          <div><h3>Новая форма</h3><p>опрос или сбор заявок</p></div>
          <Icon name="plus" size={52} weight={3.2} />
        </Link>
      </div>
      <section>
        <div className="section-head">
          <h2>Формы</h2>
          <Link href="/admin/forms" className="link">Все</Link>
        </div>
        {forms.length === 0 ? (
          <div className="empty">Форм пока нет</div>
        ) : (
          <div className="folders">{forms.slice(0, 8).map((f) => <FormFolder key={f.id} f={f} />)}</div>
        )}
      </section>
    </div>
  );
}
