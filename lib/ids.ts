import { randomBytes, randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export function newPublicSlug(): string {
  return randomBytes(9).toString("base64url");
}

export const PUBLIC_SLUG_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export function isPublicSlug(value: string): boolean {
  return PUBLIC_SLUG_PATTERN.test(value);
}
