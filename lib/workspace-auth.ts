import { createHmac, timingSafeEqual } from "node:crypto";

export const WORKSPACE_COOKIE = "shoreproof_workspace";
export const WORKSPACE_SESSION_SECONDS = 60 * 60 * 24 * 30;

const TOKEN_VERSION = "v1";

export function workspaceAuthEnabled(): boolean {
  return Boolean(process.env.WORKSPACE_PASSPHRASE);
}

export function assertWorkspaceAuthConfig(): void {
  if (
    process.env.WORKSPACE_PASSPHRASE &&
    !process.env.AUTH_SECRET?.trim()
  ) {
    throw new Error(
      "WORKSPACE_PASSPHRASE is set but AUTH_SECRET is missing. Set AUTH_SECRET to a long random string, or unset WORKSPACE_PASSPHRASE for local-only use.",
    );
  }
}

export function passphraseMatches(candidate: string): boolean {
  const expected = process.env.WORKSPACE_PASSPHRASE;
  if (!expected) return false;

  const given = Buffer.from(candidate, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required to sign a workspace session.");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createWorkspaceToken(now = Date.now()): string {
  const expires = now + WORKSPACE_SESSION_SECONDS * 1000;
  const payload = `${TOKEN_VERSION}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyWorkspaceToken(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [version, expiresRaw, signature] = parts;
  if (version !== TOKEN_VERSION || !expiresRaw || !signature) return false;

  const expires = Number(expiresRaw);
  if (!Number.isSafeInteger(expires) || expires < now) return false;

  let expected: string;
  try {
    expected = sign(`${version}.${expiresRaw}`);
  } catch {
    return false;
  }

  const given = Buffer.from(signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

/**
 * Only same-origin absolute paths are accepted after login. A value such as
 * `//example.com` or an absolute URL would turn the login form into an open
 * redirect.
 */
export function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/cleanups";
  const next = value.trim();
  if (!next.startsWith("/")) return "/cleanups";
  if (next.startsWith("//") || next.includes("\\")) return "/cleanups";
  if (next === "/login" || next.startsWith("/login?")) return "/cleanups";
  return next;
}

export function isProtectedWorkspacePath(pathname: string): boolean {
  return (
    pathname === "/setup" ||
    pathname.startsWith("/setup/") ||
    pathname === "/cleanups" ||
    pathname.startsWith("/cleanups/") ||
    pathname === "/review" ||
    pathname.startsWith("/review/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/api/pairs" ||
    pathname.startsWith("/api/pairs/") ||
    pathname === "/api/cleanups" ||
    pathname.startsWith("/api/cleanups/")
  );
}
