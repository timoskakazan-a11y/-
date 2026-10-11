import Link from "next/link";
import { db } from "@/lib/supabase";
import { loadForm, FormHeader } from "@/components/FormHeader";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { SheetTable } from "@/components/SheetTable";
import { Icon } from "@/components/Icon";
import { fieldsSchema, type FormField } from "@/lib/forms";
import { fmtDateTime, fmtShort } from "@/lib/time";
import { deleteRow } from "@/app/admin/actions";

const PAGE = 30;
const TILES = ["tile-yellow", "tile-sky", "tile-lilac", "tile-pink", "tile-mint", "tile-blue"];
const SUMMARY_LIMIT = 5000;
const TABLE_PAGE = 2000;

type Row = { id: string; data: Record<string, unknown>; created_at: string };

function norm(s: string) {
  return s.toLowerCase().replace(/[«»"'`ё]/g, (c) => (c === "ё" ? "е" : "")).replace(/\s+/g, " ").trim();
}

function summarize(field: FormField, rows: Row[]) {
  const answered = rows.filter((r) => {
    const v = r.data?.[field.id];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";
  });
  if (field.options && field.type !== "text" && field.type !== "textarea") {
    const counts = new Map(field.options.map((o) => [o, 0]));
    for (const r of answered) {
      const v = r.data[field.id];
      for (const x of Array.isArray(v) ? v : [v]) if (typeof x === "string" && counts.has(x)) counts.set(x, counts.get(x)! + 1);
    }
    return { kind: "options" as const, answered: answered.length, items: [...counts].map(([label, n]) => ({ label, n })) };
  }
  const groups = new Map<string, { label: string; n: number }>();
  for (const r of answered) {
    const v = String(r.data[field.id]);
    const k = norm(v);
    const g = groups.get(k);
    if (g) g.n++;
    else groups.set(k, { label: v.trim(), n: 1 });
  }
  const sorted = [...groups.values()].sort((a, b) => b.n - a.n);
  return { kind: "text" as const, answered: answered.length, unique: sorted.length, items: sorted.slice(0, 10), repeats: sorted.some((g) => g.n > 1) };
}

export default async function Responses({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; view?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : sp.view === "table" ? "table" : "summary";
  const page = Math.max(1, Number(sp.page) || 1);

  const { form, responses } = await loadForm(id);
  const parsed = fieldsSchema.safeParse(form.fields);
  const fields = parsed.success ? parsed.data : [];

  let rows: Row[] = [];
  let error: string | null = null;
  if (view === "summary") {
    for (let from = 0; from < SUMMARY_LIMIT; from += 1000) {
      const r = await db().from("form_responses").select("id,data,created_at").eq("form_id", id).order("created_at", { ascending: false }).range(from, from + 999);
      if (r.error) { error = r.error.message; break; }
      rows.push(...((r.data ?? []) as Row[]));
      if (!r.data || r.data.length < 1000) break;
    }
  } else if (view === "table") {
    const start = (page - 1) * TABLE_PAGE;
    for (let from = start; from < start + TABLE_PAGE; from += 1000) {
      const r = await db().from("form_responses").select("id,data,created_at").eq("form_id", id).order("created_at", { ascending: true }).range(from, Math.min(from + 999, start + TABLE_PAGE - 1));
      if (r.error) { error = r.error.message; break; }
      rows.push(...((r.data ?? []) as Row[]));
      if (!r.data || r.data.length < 1000) break;
    }
  } else {
    const r = await db().from("form_responses").select("id,data,created_at").eq("form_id", id).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
    if (r.error) error = r.error.message;
    rows = (r.data ?? []) as Row[];
  }
  const pages = Math.max(1, Math.ceil(responses / (view === "table" ? TABLE_PAGE : PAGE)));
  const extraKeys = view !== "summary" ? [...new Set(rows.flatMap((r) => Object.keys(r.data ?? {})))].filter((k) => !fields.some((f) => f.id === k)) : [];

  return (
    <div>
      <FormHeader form={form} responses={responses} active="responses" />

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="segmented" style={{ marginBottom: 0, flex: "1 1 260px", maxWidth: 420 }}>
          <Link href="?view=summary" aria-current={view === "summary" ? "page" : undefined}>Сводка</Link>
          <Link href="?view=table" aria-current={view === "table" ? "page" : undefined}>Таблица</Link>
          <Link href="?view=list" aria-current={view === "list" ? "page" : undefined}>Карточки</Link>
        </div>
        <span className="spacer" />
        <a className="btn btn-secondary btn-sm" style={{ height: 36 }} href={`/api/admin/forms/${id}/export`}><Icon name="download" size={16} /> Скачать Excel</a>
      </div>

      {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>Ошибка загрузки: {error}</div>}
      {responses === 0 && <div className="empty">Ответов пока нет. Отправьте ссылку из вкладки «Вопросы».</div>}

      {responses > 0 && view === "summary" && (
        <div className="sum-grid">
          {fields.map((f, fi) => {
            const s = summarize(f, rows);
            return (
              <section key={f.id} className={`sum-card ${TILES[fi % TILES.length]}`}>
                <h3 style={{ overflowWrap: "anywhere" }}>{f.label}</h3>
                <p className="sum-meta">
                  Ответили {s.answered} из {rows.length}
                  {s.kind === "text" && s.unique > 0 ? ` · уникальных ${s.unique}` : ""}
                </p>
                {s.kind === "options" ? (
                  <div className="bars" style={{ marginTop: 8 }}>
                    {[...s.items].sort((a, b) => b.n - a.n).map((it) => {
                      const pct = s.answered ? Math.round((it.n / s.answered) * 100) : 0;
                      return (
                        <div key={it.label} className="bar-row">
                          <div className="bar-label"><span>{it.label}</span><span>{it.n} · {pct}%</span></div>
                          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                ) : s.items.length === 0 ? (
                  <p className="sum-meta">Нет ответов</p>
                ) : (
                  <>
                    {s.repeats && <p className="sum-meta">Чаще всего (похожие ответы объединены):</p>}
                    <div className="bars" style={{ marginTop: 8 }}>
                      {s.items.map((it, k) => (
                        <div key={k} className="bar-row">
                          <div className="bar-label"><span>{it.label}</span>{s.repeats && <span>{it.n}</span>}</div>
                          {s.repeats && <div className="bar"><i style={{ width: `${Math.round((it.n / s.items[0].n) * 100)}%` }} /></div>}
                        </div>
                      ))}
                    </div>
                    {s.unique > s.items.length && (
                      <Link href="?view=list" className="sum-more">Ещё {s.unique - s.items.length} — во всех ответах</Link>
                    )}
                  </>
                )}
              </section>
            );
          })}
          {responses > SUMMARY_LIMIT && <p className="xs muted">Сводка посчитана по последним {SUMMARY_LIMIT} ответам. Полные данные — в выгрузке Excel.</p>}
        </div>
      )}

      {responses > 0 && view === "table" && (
        <>
          <SheetTable
            labels={[...fields.map((f) => f.label), ...extraKeys.map((k) => `${k} (удалённый вопрос)`)]}
            rows={rows.map((r) => ({
              id: r.id,
              created: fmtShort(r.created_at),
              cells: [...fields.map((f) => f.id), ...extraKeys].map((k) => {
                const v = r.data?.[k];
                return Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";
              }),
            }))}
            deleteAction={deleteRow}
          />
          {pages > 1 && (
            <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
              {page > 1 && <Link className="btn btn-sm" href={`?view=table&page=${page - 1}`}>← Назад</Link>}
              <span className="small muted">{page} из {pages}</span>
              {page < pages && <Link className="btn btn-sm" href={`?view=table&page=${page + 1}`}>Дальше →</Link>}
            </div>
          )}
        </>
      )}

      {responses > 0 && view === "list" && (
        <>
          <div className="answers-grid">
            {rows.map((r, i) => (
              <article key={r.id} className="answer">
                <div className="answer-head">
                  <span className="qnum">№{responses - (page - 1) * PAGE - i}</span>
                  <span>{fmtDateTime(r.created_at)}</span>
                  <span className="spacer" />
                  <ActionForm action={deleteRow} confirm="Удалить этот ответ?" inline>
                    <input type="hidden" name="table" value="form_responses" />
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="icon-btn danger" pendingText="…" title="Удалить ответ">
                      <Icon name="trash" size={18} />
                    </SubmitButton>
                  </ActionForm>
                </div>
                <dl style={{ margin: 0 }}>
                  {[...fields.map((f) => ({ k: f.id, label: f.label })), ...extraKeys.map((k) => ({ k, label: `${k} (удалённый вопрос)` }))].map(({ k, label }) => {
                    const v = r.data?.[k];
                    const text = Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";
                    if (!text) return null;
                    return (
                      <div key={k} className="qa">
                        <dt>{label}</dt>
                        <dd>{text}</dd>
                      </div>
                    );
                  })}
                </dl>
              </article>
            ))}
          </div>
          {pages > 1 && (
            <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
              {page > 1 && <Link className="btn btn-sm" href={`?view=list&page=${page - 1}`}>← Новее</Link>}
              <span className="small muted">{page} из {pages}</span>
              {page < pages && <Link className="btn btn-sm" href={`?view=list&page=${page + 1}`}>Старше →</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
