import Link from "next/link";
import { getAlbums, getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";
import { site } from "@/lib/site";

export const revalidate = 60;

export default async function Home() {
  const [events, albums] = await Promise.all([getUpcomingEvents(3), getAlbums(6)]);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">Школа №71 · {site.city}</span>
            <h1 style={{ marginTop: 16 }}>
              Медиацентр <span>71</span> — рассказываем, как живёт школа
            </h1>
            <p className="hero-lead">
              Снимаем концерты и линейки, ведём школьные соцсети, делаем фото и видео.
              Здесь — ближайшие события, фотоархив и опросы для учеников.
            </p>
            <div className="row" style={{ marginTop: 24 }}>
              <Link href="/events" className="btn">Ближайшие события</Link>
              <Link href="/albums" className="btn btn-ghost">Фотоархив</Link>
            </div>
          </div>
          <div className="hero-card" aria-hidden>
            <span className="rec">REC</span>
            <div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1 }}>Media 71</div>
              <div style={{ opacity: 0.7, marginTop: 6 }}>{site.address}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Ближайшие мероприятия</h2>
            <Link href="/events" className="btn btn-ghost btn-sm">Все события →</Link>
          </div>
          {events === null ? (
            <Unavailable />
          ) : events.length === 0 ? (
            <div className="empty">Скоро здесь появятся новые события. Следите за новостями!</div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {events.map((e) => <EventCard key={e.id} e={e} />)}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Фотоархив</h2>
            <Link href="/albums" className="btn btn-ghost btn-sm">Все альбомы →</Link>
          </div>
          {albums === null ? (
            <Unavailable />
          ) : albums.length === 0 ? (
            <div className="empty">Альбомы скоро появятся.</div>
          ) : (
            <div className="grid">{albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>
          )}
        </div>
      </section>
    </>
  );
}
