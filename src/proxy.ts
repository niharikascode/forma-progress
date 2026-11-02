import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-cookie";

// Sections that used to live at the site root now live under /app.
const LEGACY_SECTIONS = /^\/(projects|tasks|progress|reviews|settings)(\/.*)?$/;

// Optimistic check only: pages and the API verify the session in the database.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LEGACY_SECTIONS.test(pathname))
    return NextResponse.redirect(new URL(`/app${pathname}`, request.url));
  const signedIn = !!request.cookies.get(SESSION_COOKIE)?.value;
  if (!signedIn && pathname.startsWith("/api/workspace"))
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!signedIn && (pathname === "/app" || pathname.startsWith("/app/")))
    return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|excalidraw).*)"],
};
