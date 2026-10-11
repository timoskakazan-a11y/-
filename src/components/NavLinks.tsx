"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/events", label: "События" },
  { href: "/albums", label: "Фотоархив" },
  { href: "/about", label: "О нас" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Основное меню">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path.startsWith(i.href) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
