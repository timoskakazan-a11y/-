import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Кабинет старосты", template: "%s · Кабинет старосты" }, robots: { index: false, follow: false } };

export default function HeadLayout({ children }: { children: React.ReactNode }) {
  return <div className="site kid">{children}</div>;
}
