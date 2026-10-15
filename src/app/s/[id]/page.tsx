import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireHead } from "@/lib/auth";
import { classReport, getPeriod, isAccepting, monthEvents } from "@/lib/reports";
import { Icon } from "@/components/Icon";
import { ReportEditor } from "./ReportEditor";

export const metadata: Metadata = { title: "Отчёт" };
export const dynamic = "force-dynamic";

export default async function HeadReportPage({ params }: { params: Promise<{ id: string }> }) {
  const head = await requireHead();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const period = await getPeriod(id);
  if (!period) notFound();
  const [report, events] = await Promise.all([classReport(period.id, head.class_name), monthEvents(period.month)]);

  return (
    <main className="kid-page">
      <Link href="/s" className="kid-back"><Icon name="chevronLeft" size={20} /> Все отчёты</Link>
      <ReportEditor
        key={report?.updated_at ?? "new"}
        period={{ id: period.id, title: period.title, month: period.month, deadline: period.deadline }}
        accepting={isAccepting(period)}
        className={head.class_name}
        initial={{
          items: (report?.items ?? []).map((i) => ({ event_date: i.event_date, title: i.title, participants: i.participants, note: i.note, event_id: i.event_id })),
          status: report?.status ?? null,
          submittedAt: report?.submitted_at ?? null,
          updatedAt: report?.updated_at ?? null,
        }}
        events={events}
      />
    </main>
  );
}
