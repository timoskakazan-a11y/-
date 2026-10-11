import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "О нас" };

const directions = [
  { n: "01", t: "Фото", d: "Репортажи с праздников, линеек и соревнований. Всё уходит в школьный фотоархив." },
  { n: "02", t: "Видео", d: "Снимаем и монтируем ролики, ведём трансляции концертов." },
  { n: "03", t: "Тексты", d: "Новости, интервью с учителями и выпускниками, посты в соцсети." },
  { n: "04", t: "Музыка", d: "Собираем плейлисты для дискотек — из ваших заявок через наши формы." },
];

export default function AboutPage() {
  return (
    <div className="container page">
      <span className="kicker">Раздел 03</span>
      <h1 style={{ marginTop: 8 }}>Кто мы</h1>
      <p className="hero-lead" style={{ marginTop: 12 }}>
        Медиацентр — это ученики и педагоги школы №71, которым не всё равно, как запомнится школьная жизнь.
      </p>

      <div className="tickets" style={{ marginTop: 36 }}>
        {directions.map((x) => (
          <div key={x.n} className="card">
            <span className="section-num">{x.n}</span>
            <h2 style={{ marginTop: 4 }}>{x.t}</h2>
            <p style={{ marginTop: 10, color: "var(--ink-2)" }}>{x.d}</p>
          </div>
        ))}
      </div>

      <div className="card-flat" style={{ marginTop: 40 }}>
        <span className="sticker" style={{ marginBottom: 14 }}>нужны люди!</span>
        <h2>Хочешь к нам?</h2>
        <p style={{ marginTop: 10, maxWidth: 560 }}>
          Неважно, умеешь ли ты уже снимать — научим. Подойди к руководителю медиацентра
          или напиши нам в сообщество.
        </p>
        <p className="kicker" style={{ marginTop: 14 }}>{site.address}</p>
      </div>
    </div>
  );
}
