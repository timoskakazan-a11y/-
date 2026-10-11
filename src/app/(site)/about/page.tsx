import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "О нас" };

const directions = [
  { t: "Фото", d: "Репортажи с мероприятий и школьный фотоархив." },
  { t: "Видео", d: "Съёмка и монтаж роликов, трансляции концертов." },
  { t: "Тексты", d: "Новости, интервью и посты для школьных соцсетей." },
  { t: "Музыка", d: "Плейлисты для праздников и дискотек — с учётом ваших заявок." },
];

export default function AboutPage() {
  return (
    <div className="container narrow page">
      <h1>О медиацентре</h1>
      <p className="lead">
        Команда учеников и педагогов школы №71, которая рассказывает о жизни школы:
        снимает, пишет и делает так, чтобы о хороших делах узнали все.
      </p>

      <div className="list" style={{ marginTop: 32 }}>
        {directions.map((x) => (
          <div key={x.t} className="list-item" style={{ alignItems: "flex-start" }}>
            <div className="grow">
              <h3>{x.t}</h3>
              <p className="muted small" style={{ marginTop: 2 }}>{x.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-flat" style={{ marginTop: 32 }}>
        <h2>Как попасть в команду</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Неважно, умеешь ли ты уже снимать — научим. Подойди к руководителю медиацентра
          или напиши нам в сообщество.
        </p>
        <p className="small muted" style={{ marginTop: 12 }}>{site.address}</p>
      </div>
    </div>
  );
}
