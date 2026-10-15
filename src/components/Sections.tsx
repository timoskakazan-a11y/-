import Link from "next/link";
import { site } from "@/lib/site";
import { Shape, type ShapeName } from "./Shape";

const directions: { shape: ShapeName; color: string; tag: string; t: string; d: string }[] = [
  { shape: "burst", color: "ig-yellow", tag: "Праздники", t: "События", d: "Придумываем и проводим праздники, акции и дискотеки вместе с учениками и учителями." },
  { shape: "flower", color: "ig-mint", tag: "Съёмка", t: "Фото и видео", d: "Снимаем линейки, концерты и соревнования и выкладываем альбомы в сообщество." },
  { shape: "bolt", color: "ig-pink", tag: "Медиа", t: "Тексты", d: "Пишем новости, интервью и посты о том, что происходит в школе." },
  { shape: "ring", color: "ig-cream", tag: "Дискотеки", t: "Музыка", d: "Собираем плейлисты для дискотек из песен, которые предлагают ученики." },
];

export function Directions() {
  return (
    <div className="pf-dirs">
      {directions.map((x) => (
        <div key={x.t} className={`ig-tile ${x.color}`}>
          <Shape name={x.shape} className="ig-tile-shape" size={170} />
          <span className="ig-tile-label">{x.tag}</span>
          <h3>{x.t}</h3>
          <p>{x.d}</p>
        </div>
      ))}
    </div>
  );
}

export const TAGS = ["Праздники", "Фото", "Дискотеки", "Видео", "Тексты", "Соцсети", "Плейлисты", "Конкурсы"];

export function Tags() {
  return (
    <div className="ig-tags" aria-label="Чем занимаемся">
      {TAGS.map((t, i) => <span key={t} className="ig-tag" style={{ ["--r" as string]: `${[-8, 6, -3, 10, -12, 4, -6, 8][i % 8]}deg` }}>{t}</span>)}
    </div>
  );
}

export function JoinBanner() {
  return (
    <section className="ig-tile ig-yellow pf-join" id="join">
      <Shape name="flower" className="ig-tile-shape" size={260} />
      <div>
        <h2>Хочешь в команду?</h2>
        <p>Неважно, умеешь ли ты снимать или писать — научим. Подойди к нам на перемене или напиши в сообщество.</p>
      </div>
      <div className="pf-join-actions">
        {site.links.vk && (
          <a href={site.links.vk} target="_blank" rel="noopener noreferrer" className="pf-btn pf-btn-dark">Написать ВКонтакте</a>
        )}
        <Link href="/events" className="pf-btn pf-btn-ghost-dark">Посмотреть события</Link>
      </div>
    </section>
  );
}
