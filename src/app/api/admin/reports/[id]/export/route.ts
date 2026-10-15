import { NextResponse } from "next/server";
import { z } from "zod";
import { can, getActor } from "@/lib/auth";
import { getPeriod, listHeads, reportsForPeriod } from "@/lib/reports";
import { byClass } from "@/lib/people";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  // защита от CSV-инъекций формул в Excel
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function ruDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor || !can(actor, "reports")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const period = await getPeriod(id);
  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [reports, heads] = await Promise.all([reportsForPeriod(id, actor.classes), listHeads(actor.classes)]);
  const headNames = new Map<string, string[]>();
  for (const h of heads) headNames.set(h.class_name, [...(headNames.get(h.class_name) ?? []), h.full_name]);
  const byCls = new Map(reports.map((r) => [r.class_name, r]));
  const classes = [...new Set([...heads.filter((h) => h.is_active).map((h) => h.class_name), ...byCls.keys()])].sort(byClass);

  const lines = [["Класс", "Староста", "Статус", "Сдан", "Дата", "Мероприятие", "Участников", "Комментарий"].map(cell).join(";")];
  for (const cls of classes) {
    const r = byCls.get(cls);
    const status = !r ? "не начат" : r.status === "submitted" ? "сдан" : "черновик";
    const base = [cls, (headNames.get(cls) ?? []).join(", "), status, r?.submitted_at ? fmtDateTime(r.submitted_at) : ""];
    if (!r || r.items.length === 0) lines.push([...base, "", "", "", ""].map(cell).join(";"));
    else for (const it of r.items) lines.push([...base, ruDate(it.event_date), it.title, it.participants, it.note].map(cell).join(";"));
  }

  const safe = period.title.replace(/[^\p{L}\p{N} -]/gu, "").trim().replace(/\s+/g, "-") || "otchet";
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="otchet.csv"; filename*=UTF-8''${encodeURIComponent(`Отчёт-старост-${safe}.csv`)}`,
      "Cache-Control": "no-store",
    },
  });
}
