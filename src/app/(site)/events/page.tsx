import type { Metadata } from "next";
import { getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { Unavailable } from "@/components/Unavailable";

export const revalidate = 60;
export const metadata: Metadata = { title: "События" };

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <div className="container page">
      <h1 className="title-xl">События</h1>
      <p className="page-lead">Ближайшие события школы. Приходите — будет интересно.</p>
      <div style={{ marginTop: 28 }}>
        {events === null ? (
          <Unavailable />
        ) : events.length === 0 ? (
          <div className="empty">Скоро здесь появятся новые события</div>
        ) : (
          <div className="events">{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
        )}
      </div>
    </div>
  );
}
