import Link from "next/link";
import { site } from "@/lib/site";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="brand" aria-label={site.name}>
          <span className="brand-mark">71</span>
          <span className="brand-text">{site.shortName}</span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
