import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Icon, type IconName } from "@/components/Icon";

export const metadata: Metadata = { title: "О нас" };

const directions: { icon: IconName; t: string; d: string }[] = [
  { icon: "image", t: "Фото", d: "Репортажи с праздников, линеек и соревнований." },
  { icon: "calendar", t: "Видео", d: "Съёмка и монтаж роликов, трансляции концертов." },
  { icon: "forms", t: "Тексты", d: "Новости, интервью и посты для школьных соцсетей." },
  { icon: "share", t: "Музыка", d: "Плейлисты для дискотек — из ваших заявок." },
];

export default function AboutPage() {
  return (
    <div className="container narrow page">
      <h1>О медиацентре</h1>
      <p className="page-lead">
        Ученики и педагоги школы №71, которые рассказывают о жизни школы — так, чтобы её
        хотелось запомнить.
      </p>

      <div className="group-title" style={{ marginTop: 36 }}>Чем занимаемся</div>
      <div className="list">
        {directions.map((x) => (
          <div key={x.t} className="list-item" style={{ alignItems: "flex-start", paddingTop: 14, paddingBottom: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--blue-tint)", color: "var(--blue)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={x.icon} size={18} /></span>
            <div className="grow">
              <h3>{x.t}</h3>
              <p className="small muted" style={{ marginTop: 2 }}>{x.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 32 }}>
        <h2>Хочешь в команду?</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Неважно, умеешь ли ты снимать — научим. Подойди к руководителю медиацентра или напиши нам.
        </p>
        <p className="xs muted" style={{ marginTop: 16 }}>{site.address}</p>
      </div>
    </div>
  );
}
