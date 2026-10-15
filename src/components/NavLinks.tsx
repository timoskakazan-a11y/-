"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Главная" },
  { href: "/events", label: "События" },
  { href: "/albums", label: "Фотоархив" },
  { href: "/about", label: "О нас" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="pf-nav" aria-label="Основное меню">
      {items.map((i) => {
        const on = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
