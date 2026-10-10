import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/basic-auth";

// First line of defence for /dashboard. The page checks again itself, because a
// matcher change or a proxy bypass (e.g. CVE-2025-29927) would silently skip this.
export function proxy(request: NextRequest) {
  if (isAuthorized(request.headers.get("authorization"))) return NextResponse.next();
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="dashboard", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
