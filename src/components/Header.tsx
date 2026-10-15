import Link from "next/link";
import { site } from "@/lib/site";
import { NavLinks } from "./NavLinks";
import { LogoMark } from "./Logo";

export function Header() {
  return (
    <header className="pf-header">
      <div className="container pf-header-in">
        <Link href="/" className="pf-brand" aria-label={site.name}>
          <LogoMark height={42} bg="#F4F2EE" fg="#16161B" />
          <span className="pf-brand-text">
            <b>Инициативная группа</b>
            <span>школы №71 · Казань</span>
          </span>
        </Link>
        <NavLinks />
        <Link href="/about#join" className="pf-btn pf-btn-primary pf-header-cta">Вступить<span className="pf-hide-sm">&nbsp;в команду</span></Link>
      </div>
    </header>
  );
}
