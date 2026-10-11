import Link from "next/link";
import { Icon, type IconName } from "./Icon";

type Props = {
  href: string;
  external?: boolean;
  color: string;
  title: string;
  sub?: string;
  badge?: number | string;
  icon?: IconName;
  cover?: string | null;
  papers?: 0 | 1 | 2;
};

/** Карточка-папка: вкладка, выглядывающие «документы» (или фото), иконка на лицевой стороне. */
export function Folder({ href, external, color, title, sub, badge, icon = "folder", cover, papers = 2 }: Props) {
  const art = (
    <div className={`folder-art ${color}`}>
      <span className="folder-tab" />
      {papers > 1 && <span className="folder-paper second" />}
      {papers > 0 && (
        <span className="folder-paper" style={cover ? { backgroundImage: `url("${cover.replace(/"/g, "%22")}")` } : undefined} />
      )}
      <span className="folder-body">
        <span />
        <Icon name={icon} size={30} weight={2.6} />
      </span>
    </div>
  );
  const meta = (
    <>
      <div className="folder-meta">
        <h3 className="clamp2">{title}</h3>
        {badge !== undefined && <span className="badge">{badge}</span>}
      </div>
      {sub && <div className="folder-sub truncate">{sub}</div>}
    </>
  );
  return external ? (
    <a className="folder" href={href} target="_blank" rel="noopener noreferrer">{art}{meta}</a>
  ) : (
    <Link className="folder" href={href}>{art}{meta}</Link>
  );
}
