import type { Metadata } from "next";
import { getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;
export const metadata: Metadata = { title: "Афиша" };

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <div className="container page">
      <span className="kicker">Раздел 01</span>
      <h1 style={{ marginTop: 8 }}>Афиша</h1>
      <p className="hero-lead" style={{ marginTop: 12 }}>Ближайшие события школы. Приходите — мы будем снимать.</p>
      <div style={{ marginTop: 32 }}>
        {events === null ? (
          <Unavailable />
        ) : events.length === 0 ? (
          <div className="empty">пока тихо — скоро что-нибудь придумаем</div>
        ) : (
          <div className="tickets">{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
        )}
      </div>
    </div>
  );
}
