import Link from "next/link";
import { getAlbums, getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";
import { Icon } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";
import { Directions, JoinBanner } from "@/components/Sections";

export const revalidate = 60;

export default async function Home() {
  const [events, albums] = await Promise.all([getUpcomingEvents(4), getAlbums(8)]);

  return (
    <>
      <div className="container">
        <section className="pf-hero">
          <div className="pf-hero-text">
            <span className="pf-eyebrow">Школа №71 · Казань</span>
            <h1>Инициативная группа&nbsp;71</h1>
            <p>Придумываем и проводим школьные события, снимаем праздники, ведём соцсети и собираем музыку для дискотек.</p>
            <div className="pf-hero-actions">
              <Link href="/events" className="pf-btn pf-btn-white">Ближайшие события</Link>
              <Link href="/about" className="pf-btn pf-btn-outline-white">О команде</Link>
            </div>
          </div>
          <div className="pf-hero-art" aria-hidden>
            <LogoFull height={300} bg="#FFFFFF" fg="#2150F5" />
          </div>
        </section>
      </div>

      <section className="pf-section">
        <div className="container">
          <div className="pf-section-head">
            <h2>Ближайшие события</h2>
            <Link href="/events" className="pf-link">Все события <Icon name="arrowRight" size={18} /></Link>
          </div>
          {events === null ? (
            <Unavailable />
          ) : events.length === 0 ? (
            <div className="pf-empty"><Icon name="calendar" size={28} /><p>Скоро здесь появятся новые события</p></div>
          ) : (
            <div className="pf-events">{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
          )}
        </div>
      </section>

      <section className="pf-section pf-section-tint">
        <div className="container">
          <div className="pf-section-head">
            <h2>Чем мы занимаемся</h2>
          </div>
          <Directions />
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
          ) : albums.length === 0 ? (
            <div className="pf-empty"><Icon name="image" size={28} /><p>Альбомы скоро появятся</p></div>
          ) : (
            <div className="pf-albums">{albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>
          )}
        </div>
      </section>

      <div className="container" style={{ paddingBottom: 80 }}>
        <JoinBanner />
      </div>
    </>
  );
}
