import type { Metadata } from "next";
import { getUpcomingEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { Unavailable } from "@/components/Unavailable";
import { Icon } from "@/components/Icon";
import { PageHead } from "@/components/PageHead";

export const revalidate = 60;
export const metadata: Metadata = { title: "События" };

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <>
      <PageHead title="События" lead="Ближайшие события школы. Приходите — будет интересно." />
      <div className="container" style={{ paddingBottom: 80 }}>
      <div>
        {events === null ? (
          <Unavailable />
        ) : events.length === 0 ? (
          <div className="pf-empty"><Icon name="calendar" size={28} /><p>Скоро здесь появятся новые события</p></div>
        ) : (
          <div className="pf-events">{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
        )}
      </div>
    </div>
    </>
  );
}
