import Link from "next/link";
import type { Actor } from "@/lib/auth";

/** Подразделы «Старосты»: отчёты и учётные записи */
export function HeadsNav({ actor, active }: { actor: Actor; active: "reports" | "heads" }) {
  const items = [
    actor.perms.includes("reports") && { href: "/admin/reports", key: "reports", label: "Отчёты" },
    actor.perms.includes("heads") && { href: "/admin/heads", key: "heads", label: "Старосты и пароли" },
  ].filter(Boolean) as { href: string; key: string; label: string }[];
  if (items.length < 2) return null;
  return (
    <nav className="segmented" aria-label="Раздел" style={{ maxWidth: 420 }}>
      {items.map((i) => <Link key={i.key} href={i.href} aria-current={active === i.key ? "page" : undefined}>{i.label}</Link>)}
    </nav>
  );
}
