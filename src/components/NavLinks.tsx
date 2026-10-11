"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Главная" },
  { href: "/events", label: "Мероприятия" },
  { href: "/albums", label: "Фотоархив" },
  { href: "/about", label: "О нас" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Основное меню">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={i.href === "/" ? "nav-home" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
