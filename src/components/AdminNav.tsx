"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

export type NavKey = "home" | "forms" | "heads" | "events" | "albums" | "team";
const ALL: { key: NavKey; href: string; label: string; icon: IconName; match?: string[] }[] = [
  { key: "home", href: "/admin", label: "Обзор", icon: "home" },
  { key: "heads", href: "/admin/reports", label: "Старосты", icon: "users", match: ["/admin/reports", "/admin/heads"] },
  { key: "forms", href: "/admin/forms", label: "Формы", icon: "forms" },
  { key: "events", href: "/admin/events", label: "События", icon: "calendar" },
  { key: "albums", href: "/admin/albums", label: "Альбомы", icon: "image" },
  { key: "team", href: "/admin/team", label: "Команда", icon: "lock" },
];

function isActive(path: string, i: (typeof ALL)[number]) {
  if (i.href === "/admin") return path === "/admin";
  return (i.match ?? [i.href]).some((m) => path.startsWith(m));
}

/** headsHref — куда ведёт «Старосты», если у сотрудника есть только управление старостами */
function useItems(keys: NavKey[], headsHref: string) {
  return ALL.filter((i) => keys.includes(i.key)).map((i) => (i.key === "heads" ? { ...i, href: headsHref } : i));
}

export function AdminNav({ keys, headsHref = "/admin/reports" }: { keys: NavKey[]; headsHref?: string }) {
  const path = usePathname();
  const items = useItems(keys, headsHref);
  return (
    <nav className="admin-nav" aria-label="Разделы">
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={isActive(path, i) ? "page" : undefined}>{i.label}</Link>
      ))}
    </nav>
  );
}

export function AdminTabbar({ keys, headsHref = "/admin/reports" }: { keys: NavKey[]; headsHref?: string }) {
  const path = usePathname();
  const items = useItems(keys, headsHref);
  if (items.length < 2) return null;
  return (
    <nav className="tabbar" aria-label="Разделы" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={isActive(path, i) ? "page" : undefined}>
          <Icon name={i.icon} size={22} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
