import { NextResponse, type NextRequest } from "next/server";
import {
  isProtectedWorkspacePath,
  verifyWorkspaceToken,
  WORKSPACE_COOKIE,
  workspaceAuthEnabled,
} from "@/lib/workspace-auth";

/**
 * The public site and a published `/p/[slug]` record stay readable without the
 * passphrase. Everything that can read or write the workspace does not.
 */
export function proxy(request: NextRequest) {
  if (!workspaceAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (!isProtectedWorkspacePath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(WORKSPACE_COOKIE)?.value;
  if (verifyWorkspaceToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Workspace passphrase required." },
      { status: 401 },
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/setup/:path*",
    "/cleanups/:path*",
    "/review/:path*",
    "/settings/:path*",
    "/api/pairs/:path*",
    "/api/cleanups/:path*",
  ],
};
