import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "О медиацентре" };

const directions = [
  { t: "Фото", d: "Репортажная съёмка мероприятий, портреты, школьные фотоархивы." },
  { t: "Видео", d: "Съёмка и монтаж роликов, трансляции концертов и линеек." },
  { t: "Тексты", d: "Новости, интервью, посты для школьных соцсетей." },
  { t: "Звук и дискотеки", d: "Подготовка музыки для праздников, сбор плейлистов от учеников." },
];

export default function AboutPage() {
  return (
    <div className="container section">
      <div style={{ maxWidth: 760 }}>
        <h1>О медиацентре</h1>
        <p className="hero-lead">
          Медиацентр — это команда учеников и педагогов школы №71 города Казани, которые
          рассказывают о жизни школы: снимают, пишут и делают так, чтобы о хороших делах узнали все.
        </p>
      </div>

      <div className="grid" style={{ marginTop: 32 }}>
        {directions.map((x) => (
          <div key={x.t} className="card">
            <h3>{x.t}</h3>
            <p className="muted" style={{ margin: 0 }}>{x.d}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 32 }}>
        <h2>Как попасть в команду</h2>
        <p>
          Мы всегда рады новым людям — неважно, умеешь ты уже снимать или только хочешь научиться.
          Подходи к руководителю медиацентра или напиши нам в сообщество.
        </p>
        <div className="muted small">
          {site.school} · {site.address}
        </div>
      </div>
    </div>
  );
}
