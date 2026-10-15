import Link from "next/link";
import { site } from "@/lib/site";
import { Icon, type IconName } from "./Icon";

const directions: { icon: IconName; t: string; d: string }[] = [
  { icon: "users", t: "События", d: "Придумываем и проводим праздники, акции и дискотеки вместе с учениками и учителями." },
  { icon: "camera", t: "Фото и видео", d: "Снимаем линейки, концерты и соревнования и выкладываем альбомы в сообщество." },
  { icon: "pen", t: "Тексты", d: "Пишем новости, интервью и посты о том, что происходит в школе." },
  { icon: "music", t: "Музыка", d: "Собираем плейлисты для дискотек из песен, которые предлагают ученики." },
];

export function Directions() {
  return (
    <div className="pf-dirs">
      {directions.map((x) => (
        <div key={x.t} className="pf-dir">
          <span className="pf-dir-icon"><Icon name={x.icon} size={24} /></span>
          <h3>{x.t}</h3>
          <p>{x.d}</p>
        </div>
      ))}
    </div>
  );
}

export function JoinBanner() {
  return (
    <section className="pf-join" id="join">
      <div>
        <h2>Хочешь в команду?</h2>
        <p>Неважно, умеешь ли ты снимать или писать — научим. Подойди к нам на перемене или напиши в сообщество.</p>
      </div>
      <div className="pf-join-actions">
        {site.links.vk && (
          <a href={site.links.vk} target="_blank" rel="noopener noreferrer" className="pf-btn pf-btn-primary">
            Написать ВКонтакте
          </a>
        )}
        <Link href="/events" className="pf-btn pf-btn-secondary">Посмотреть события</Link>
      </div>
    </section>
  );
}
