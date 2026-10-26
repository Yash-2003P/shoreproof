import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertWorkspaceAuthConfig,
  createWorkspaceToken,
  isProtectedWorkspacePath,
  passphraseMatches,
  safeNextPath,
  verifyWorkspaceToken,
  WORKSPACE_SESSION_SECONDS,
  workspaceAuthEnabled,
} from "../lib/workspace-auth";

const original = {
  passphrase: process.env.WORKSPACE_PASSPHRASE,
  secret: process.env.AUTH_SECRET,
};

function restore(key: "passphrase" | "secret") {
  const value = original[key];
  const name = key === "passphrase" ? "WORKSPACE_PASSPHRASE" : "AUTH_SECRET";
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("workspace passphrase", () => {
  beforeEach(() => {
    delete process.env.WORKSPACE_PASSPHRASE;
    delete process.env.AUTH_SECRET;
  });

  afterEach(() => {
    restore("passphrase");
    restore("secret");
    vi.useRealTimers();
  });

  it("is disabled when no passphrase is configured", () => {
    expect(workspaceAuthEnabled()).toBe(false);
    expect(passphraseMatches("anything")).toBe(false);
  });

  it("matches only the exact passphrase", () => {
    process.env.WORKSPACE_PASSPHRASE = "salt-marsh-42";

    expect(workspaceAuthEnabled()).toBe(true);
    expect(passphraseMatches("salt-marsh-42")).toBe(true);
    expect(passphraseMatches("salt-marsh-43")).toBe(false);
    expect(passphraseMatches("salt-marsh-42 ")).toBe(false);
    expect(passphraseMatches("")).toBe(false);
  });

  it("refuses a passphrase without a signing secret", () => {
    process.env.WORKSPACE_PASSPHRASE = "salt-marsh-42";
    expect(() => assertWorkspaceAuthConfig()).toThrow(/AUTH_SECRET/);

    process.env.AUTH_SECRET = "a-long-test-secret";
    expect(() => assertWorkspaceAuthConfig()).not.toThrow();
  });

  it("round-trips a signed session and rejects tampering or expiry", () => {
    process.env.WORKSPACE_PASSPHRASE = "salt-marsh-42";
    process.env.AUTH_SECRET = "a-long-test-secret";

    const now = Date.UTC(2026, 9, 26, 12, 0, 0);
    const token = createWorkspaceToken(now);
    expect(verifyWorkspaceToken(token, now + 1_000)).toBe(true);
    expect(
      verifyWorkspaceToken(
        token,
        now + WORKSPACE_SESSION_SECONDS * 1000 + 1,
      ),
    ).toBe(false);

    const [version, expires, signature] = token.split(".");
    expect(
      verifyWorkspaceToken(`${version}.${Number(expires) + 1}.${signature}`, now),
    ).toBe(false);
    expect(
      verifyWorkspaceToken(
        `${version}.${expires}.${signature.slice(0, -1)}0`,
        now,
      ),
    ).toBe(false);
    expect(verifyWorkspaceToken("not-a-token", now)).toBe(false);
    expect(verifyWorkspaceToken(undefined, now)).toBe(false);
  });

  it("cannot verify a session without the secret", () => {
    process.env.AUTH_SECRET = "a-long-test-secret";
    const token = createWorkspaceToken();
    delete process.env.AUTH_SECRET;

    expect(verifyWorkspaceToken(token)).toBe(false);
    expect(() => createWorkspaceToken()).toThrow(/AUTH_SECRET/);
  });

  it("accepts only same-origin paths after login", () => {
    expect(safeNextPath("/cleanups/abc")).toBe("/cleanups/abc");
    expect(safeNextPath("/review?claim=1")).toBe("/review?claim=1");
    expect(safeNextPath("https://example.com")).toBe("/cleanups");
    expect(safeNextPath("//example.com")).toBe("/cleanups");
    expect(safeNextPath("/\\example.com")).toBe("/cleanups");
    expect(safeNextPath("/login?next=/cleanups")).toBe("/cleanups");
    expect(safeNextPath("")).toBe("/cleanups");
    expect(safeNextPath(null)).toBe("/cleanups");
  });

  it("protects the workspace but not the public site or photo routes", () => {
    for (const path of [
      "/setup",
      "/cleanups",
      "/cleanups/abc",
      "/cleanups/abc/pairs/def",
      "/review",
      "/review/abc",
      "/settings",
      "/api/pairs/abc/photos",
      "/api/cleanups/abc/export",
    ]) {
      expect(isProtectedWorkspacePath(path), path).toBe(true);
    }

    for (const path of [
      "/",
      "/how-it-works",
      "/evidence",
      "/for-organizers",
      "/for-reviewers",
      "/privacy",
      "/about",
      "/login",
      "/p/abc",
      "/api/photos/abc",
      "/cleanupsx",
    ]) {
      expect(isProtectedWorkspacePath(path), path).toBe(false);
    }
  });
});
