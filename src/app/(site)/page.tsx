import Link from "next/link";
import { getAlbums, getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";
import { site } from "@/lib/site";

export const revalidate = 60;

export default async function Home() {
  const [events, albums] = await Promise.all([getUpcomingEvents(4), getAlbums(6)]);

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">{site.school}</div>
        <h1>Медиацентр школы&nbsp;№71</h1>
        <p className="lead">
          Снимаем, пишем и рассказываем о жизни школы. Здесь ближайшие события, фотографии
          с мероприятий и опросы для учеников.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Ближайшие события</h2>
          <Link href="/events" className="link">Все</Link>
        </div>
        {events === null ? (
          <Unavailable />
        ) : events.length === 0 ? (
          <div className="empty">Пока ничего не запланировано</div>
        ) : (
          <div>{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
        )}
      </section>

      <section className="section" style={{ paddingBottom: 64 }}>
        <div className="section-head">
          <h2>Фотоархив</h2>
          <Link href="/albums" className="link">Все альбомы</Link>
        </div>
        {albums === null ? (
          <Unavailable />
        ) : albums.length === 0 ? (
          <div className="empty">Альбомы скоро появятся</div>
        ) : (
          <div className="grid">{albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>
        )}
      </section>
    </div>
  );
}
