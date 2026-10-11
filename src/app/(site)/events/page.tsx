import type { Metadata } from "next";
import { getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;
export const metadata: Metadata = { title: "Мероприятия" };

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <div className="container section">
      <h1>Мероприятия</h1>
      <p className="muted">Ближайшие события школы, которые освещает медиацентр.</p>
      <div className="stack" style={{ marginTop: 24 }}>
        {events === null ? (
          <Unavailable />
        ) : events.length === 0 ? (
          <div className="empty">Пока нет запланированных мероприятий.</div>
        ) : (
          events.map((e) => <EventCard key={e.id} e={e} />)
        )}
      </div>
    </div>
  );
}
