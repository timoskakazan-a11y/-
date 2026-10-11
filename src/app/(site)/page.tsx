import Link from "next/link";
import { getAlbums, getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { AlbumCard } from "@/components/AlbumCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;

const TICKER = ["Снимаем", "Пишем", "Монтируем", "Ведём эфиры", "Собираем плейлисты", "Делаем фотоархив"];

export default async function Home() {
  const [events, albums] = await Promise.all([getUpcomingEvents(4), getAlbums(6)]);

  return (
    <>
      <section className="hero">
        <div className="hero-dots" aria-hidden />
        <div className="hero-blob" aria-hidden />
        <div className="container hero-inner">
          <span className="kicker">Школьный медиацентр · с нами с первого звонка</span>
          <h1 className="hero-title" style={{ marginTop: 14 }}>
            <span className="pink">Всё,</span><br />
            что было<br />
            <span className="blue">в кадре</span>
          </h1>
          <p className="hero-lead">
            Мы — медиацентр школы №71. Снимаем праздники и линейки, ведём школьные соцсети,
            собираем музыку для дискотек. Тут — афиша, фотоархив и наши опросы.
          </p>
          <div className="hero-actions">
            <Link href="/events" className="btn btn-lg">Афиша</Link>
            <Link href="/albums" className="btn btn-secondary btn-lg">Фотоархив</Link>
            <span className="sticker">мы тебя сняли!</span>
          </div>
        </div>
      </section>

      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      <div className="container">
        <section className="section">
          <div className="section-head">
            <h2><span className="section-num">01</span>Афиша</h2>
            <Link href="/events" className="link">Все события</Link>
          </div>
          {events === null ? (
            <Unavailable />
          ) : events.length === 0 ? (
            <div className="empty">пока тихо — скоро что-нибудь придумаем</div>
          ) : (
            <div className="tickets">{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
          )}
        </section>

        <section className="section" style={{ paddingBottom: 80 }}>
          <div className="section-head">
            <h2><span className="section-num">02</span>Плёнка</h2>
            <Link href="/albums" className="link">Весь архив</Link>
          </div>
          {albums === null ? (
            <Unavailable />
          ) : albums.length === 0 ? (
            <div className="empty">плёнка ещё проявляется…</div>
          ) : (
            <div className="film">{albums.map((a, i) => <AlbumCard key={a.id} a={a} n={i} />)}</div>
          )}
        </section>
      </div>
    </>
  );
}
