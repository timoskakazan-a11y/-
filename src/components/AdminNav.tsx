"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Обзор", icon: "home" },
  { href: "/admin/forms", label: "Формы", icon: "forms" },
  { href: "/admin/events", label: "События", icon: "calendar" },
  { href: "/admin/albums", label: "Альбомы", icon: "image" },
];

function isActive(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path.startsWith(href);
}

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Разделы">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined}>{i.label}</Link>
      ))}
    </nav>
  );
}

export function AdminTabbar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Разделы">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined}>
          <Icon name={i.icon} size={22} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
