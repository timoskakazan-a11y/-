import Link from "next/link";
import { getAlbums, getUpcomingEvents, type EventItem } from "@/lib/data";
import { EventCard, eventDate } from "@/components/EventCard";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";
import { Icon } from "@/components/Icon";
import { Shape, lookFor } from "@/components/Shape";
import { JoinBanner, Tags } from "@/components/Sections";
import { plural } from "@/components/FormListItem";

export const revalidate = 60;

function SoonTile({ n }: { n: number }) {
  return (
    <Link href="/events" className={`ig-tile ${n ? "ig-mint" : "ig-cream"}`}>
      <Shape name={n ? "star" : "burst"} className="ig-tile-shape" size={170} />
      <span className="ig-tile-label">Событие</span>
      <h3>Скоро новый анонс</h3>
      <span className="ig-tile-meta">Следите за афишей</span>
    </Link>
  );
}

function EventTile({ e, n }: { e: EventItem; n: number }) {
  const { day, month, time } = eventDate(e.starts_at);
  const look = lookFor(e.id, n);
  return (
    <Link href="/events" className={`ig-tile ${look.color}`}>
      <Shape name={look.shape} className="ig-tile-shape" size={170} />
      <span className="ig-tile-label">Событие</span>
      <h3 className="ig-clamp" title={e.title}>{e.title}</h3>
      <span className="ig-tile-meta ig-clamp-1">{day} {month} · {time}{e.location ? ` · ${e.location}` : ""}</span>
    </Link>
  );
}

export default async function Home() {
  const [events, albums] = await Promise.all([getUpcomingEvents(50), getAlbums(100)]);
  const ev = events ?? [];
  const al = albums ?? [];

  return (
    <>
      <div className="container">
        <section className="ig-hero">
          <span className="ig-eyebrow">Инициативная группа школы №71 · Казань</span>
          <h1 className="ig-headline">
            <span className="ig-line">Делаем <span className="ig-chip ig-blue ig-chip-wide" aria-hidden><Shape name="flower" size="0.5em" /><Shape name="petals" size="0.5em" /><Shape name="half" size="0.5em" /></span></span>{" "}
            <span className="ig-line"><span className="ig-chip ig-mint" aria-hidden><Shape name="star" size="0.5em" /></span> школу</span>{" "}
            <span className="ig-line">ярче <span className="ig-chip ig-yellow" aria-hidden><Shape name="ring" size="0.5em" /></span></span>
          </h1>
          <p className="ig-lead">Придумываем и проводим школьные события, снимаем праздники, ведём соцсети и собираем музыку для дискотек.</p>
        </section>

        <section className="ig-bento" aria-label="Коротко">
          {ev[0] ? <EventTile e={ev[0]} n={0} /> : <SoonTile n={0} />}
          <Link href="/events" className="ig-tile ig-blue ig-stat">
            <Shape name="burst" className="ig-tile-shape" size={170} />
            <span className="ig-tile-label">Афиша</span>
            <b>{ev.length}</b>
            <span>{plural(ev.length, "событие", "события", "событий")} впереди</span>
          </Link>
          {ev[1] ? <EventTile e={ev[1]} n={1} /> : <SoonTile n={1} />}
          <Link href="/albums" className="ig-tile ig-pink ig-stat">
            <Shape name="petals" className="ig-tile-shape" size={170} />
            <span className="ig-tile-label">Фотоархив</span>
            <b>{al.length}</b>
            <span>{plural(al.length, "альбом", "альбома", "альбомов")}</span>
          </Link>
          <div className="ig-tile ig-outline ig-wide">
            <span className="ig-tile-label">Чем занимаемся</span>
            <Tags />
          </div>
          <Link href="/about#join" className="ig-tile ig-cream ig-wide ig-cta">
            <Shape name="flower" className="ig-tile-shape" size={220} />
            <span className="ig-tile-label">Команда</span>
            <h3>Хочешь с нами?</h3>
            <span className="ig-tile-go">Как вступить <Icon name="arrowRight" size={18} /></span>
          </Link>
        </section>
      </div>

      <section className="pf-section">
        <div className="container">
          <div className="pf-section-head">
            <h2>Афиша</h2>
            <Link href="/events" className="pf-link">Все события <Icon name="arrowRight" size={18} /></Link>
          </div>
          {events === null ? (
            <Unavailable />
          ) : ev.length === 0 ? (
            <div className="pf-empty"><Icon name="calendar" size={28} /><p>Скоро здесь появятся новые события</p></div>
          ) : (
            <div className="pf-events">{ev.slice(0, 4).map((e) => <EventCard key={e.id} e={e} />)}</div>
          )}
        </div>
      </section>

      <section className="pf-section">
        <div className="container">
          <div className="pf-section-head">
            <h2>Фотоархив</h2>
            <Link href="/albums" className="pf-link">Все альбомы <Icon name="arrowRight" size={18} /></Link>
          </div>
          {albums === null ? (
            <Unavailable />
          ) : al.length === 0 ? (
            <div className="pf-empty"><Icon name="image" size={28} /><p>Альбомы скоро появятся</p></div>
          ) : (
            <div className="pf-albums">{al.slice(0, 8).map((a) => <AlbumCard key={a.id} a={a} />)}</div>
          )}
        </div>
      </section>

      <div className="container" style={{ paddingBottom: 80 }}>
        <JoinBanner />
      </div>
    </>
  );
}
