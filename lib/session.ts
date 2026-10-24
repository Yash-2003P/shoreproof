import { cookies } from "next/headers";
import type { User } from "./types";
import { getUser, listUsers } from "./users";

export const USER_COOKIE = "shoreproof_user_id";

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(USER_COOKIE)?.value;

  if (id) {
    const user = getUser(id);
    if (user) return user;
  }

  const users = listUsers();
  return users[0] ?? null;
}

export async function setCurrentUser(id: string): Promise<void> {
  const store = await cookies();
  store.set(USER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
