import Link from "next/link";
import { site } from "@/lib/site";
import { NavLinks } from "./NavLinks";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="navbar">
      <div className="container">
        <Link href="/" aria-label={site.name}>
          <Logo />
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
