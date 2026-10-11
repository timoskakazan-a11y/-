import Link from "next/link";
import { getAlbums, getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;

export default async function Home() {
  const [events, albums] = await Promise.all([getUpcomingEvents(4), getAlbums(6)]);

  return (
    <div className="container">
      <section className="hero">
        <span className="hero-eyebrow">Школа №71 · Казань</span>
        <h1>Медиацентр <span className="accent">школы №71</span></h1>
        <p className="hero-lead">
          Снимаем праздники и линейки, ведём школьные соцсети и собираем музыку для дискотек.
          Здесь — ближайшие события и фотографии.
        </p>
        <div className="hero-actions">
          <Link href="/events" className="btn btn-primary btn-lg">Ближайшие события</Link>
          <Link href="/albums" className="btn btn-secondary btn-lg">Фотоархив</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Ближайшие события</h2>
          <Link href="/events" className="link">Все</Link>
        </div>
        {events === null ? (
          <Unavailable />
        ) : events.length === 0 ? (
          <div className="empty">Скоро здесь появятся новые события</div>
        ) : (
          <div className="events">{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
        )}
      </section>

      <section className="section" style={{ paddingBottom: 72 }}>
        <div className="section-head">
          <h2>Фотоархив</h2>
          <Link href="/albums" className="link">Все</Link>
        </div>
        {albums === null ? (
          <Unavailable />
        ) : albums.length === 0 ? (
          <div className="empty">Альбомы скоро появятся</div>
        ) : (
          <div className="albums">{albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>
        )}
      </section>
    </div>
  );
}
