import type { Metadata } from "next";
import { getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;
export const metadata: Metadata = { title: "События" };

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <div className="container narrow page">
      <h1>События</h1>
      <p className="lead">Ближайшие мероприятия школы, которые освещает медиацентр.</p>
      <div style={{ marginTop: 24 }}>
        {events === null ? (
          <Unavailable />
        ) : events.length === 0 ? (
          <div className="empty">Пока ничего не запланировано</div>
        ) : (
          events.map((e) => <EventCard key={e.id} e={e} />)
        )}
      </div>
    </div>
  );
}
