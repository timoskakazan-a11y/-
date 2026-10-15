import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { can, getActor } from "@/lib/auth";
import { fieldsSchema } from "@/lib/forms";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cell(v: unknown) {
  let s = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
  // защита от CSV-инъекций формул в Excel
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!can(await getActor(), "forms")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: form } = await db().from("forms").select("slug,fields").eq("id", id).maybeSingle();
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fields = fieldsSchema.safeParse(form.fields);
  const cols = fields.success ? fields.data : [];

  // выгружаем все ответы постранично
  const rows: { data: Record<string, unknown>; created_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("form_responses")
      .select("data,created_at")
      .eq("form_id", id)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const header = ["№", "Время", ...cols.map((c) => c.label)];
  const lines = [header.map(cell).join(";")];
  rows.forEach((r, i) => {
    lines.push([i + 1, fmtDateTime(r.created_at), ...cols.map((c) => r.data?.[c.id])].map(cell).join(";"));
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${form.slug}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
