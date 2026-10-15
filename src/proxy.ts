import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

// Первый рубеж: без подходящей сессии в админку и кабинет старосты не попасть.
// Второй рубеж — requireStaff()/requireHead() внутри каждой страницы и действия.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || pathname === "/s/login") return withNoIndex(NextResponse.next());

  const s = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isHeadArea = pathname === "/s" || pathname.startsWith("/s/");
  const ok = isHeadArea ? s?.role === "head" : !!s && s.role !== "head";
  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = isHeadArea ? "/s/login" : "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return withNoIndex(NextResponse.next());
}

function withNoIndex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*", "/s", "/s/:path*"],
};
