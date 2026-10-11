import Link from "next/link";
import { getAlbums, getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";
import { Icon } from "@/components/Icon";
import { site } from "@/lib/site";

export const revalidate = 60;

export default async function Home() {
  const [events, albums] = await Promise.all([getUpcomingEvents(4), getAlbums(8)]);

  return (
    <div className="container">
      <section className="hero">
        <p className="muted" style={{ fontSize: 15, fontWeight: 500 }}>{site.school}</p>
        <h1 className="title-xl" style={{ marginTop: 8 }}>Медиацентр 71</h1>
        <p className="hero-lead">
          Снимаем праздники и линейки, ведём школьные соцсети и собираем музыку для дискотек.
        </p>
      </section>

      <nav className="tiles" aria-label="Разделы" style={{ marginTop: 24 }}>
        <Link href="/events" className="tile tile-yellow">
          <div><h3>События</h3><p>Афиша школы</p></div>
          <Icon name="asterisk" size={52} weight={3.2} />
        </Link>
        <Link href="/albums" className="tile tile-sky">
          <div><h3>Фотоархив</h3><p>Альбомы с праздников</p></div>
          <Icon name="camera" size={52} weight={2.8} />
        </Link>
        <Link href="/about" className="tile tile-lilac">
          <div><h3>Команда</h3><p>Кто мы и как к нам попасть</p></div>
          <Icon name="mic" size={52} weight={2.8} />
        </Link>
        {site.links.vk ? (
          <a href={site.links.vk} target="_blank" rel="noopener noreferrer" className="tile tile-pink">
            <div><h3>ВКонтакте</h3><p>Новости и фото первыми</p></div>
            <Icon name="arrowUpRight" size={52} weight={3.2} />
          </a>
        ) : null}
      </nav>

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
          <div className="folders">{albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>
        )}
      </section>
    </div>
  );
}
