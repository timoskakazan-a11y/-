import Link from "next/link";
import { Icon } from "./Icon";
import { isAccepting } from "@/lib/admin-data";

type F = { id: string; slug: string; title: string; is_open: boolean; closes_at: string | null; max_responses: number | null; responses: number };

export function FormListItem({ f }: { f: F }) {
  const open = isAccepting(f, f.responses);
  return (
    <Link href={`/admin/forms/${f.id}`} className="list-item">
      <div className="grow">
        <div className="truncate" style={{ fontWeight: 550 }}>{f.title}</div>
        <div className="row xs muted" style={{ marginTop: 4, gap: 10 }}>
          {open ? <span className="pill pill-ok">принимает</span> : <span className="pill">закрыта</span>}
          <span>{f.responses} {plural(f.responses, "ответ", "ответа", "ответов")}</span>
        </div>
      </div>
      <Icon name="chevronRight" className="chev" />
    </Link>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
