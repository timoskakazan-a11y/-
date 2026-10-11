import Link from "next/link";
import { site } from "@/lib/site";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="navbar">
      <div className="container">
        <Link href="/" className="logo" aria-label={site.name}>
          <span className="logo-mark">71</span>
          <span className="logo-text">Медиацентр</span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
