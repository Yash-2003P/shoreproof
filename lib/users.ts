import { getDb } from "./db";
import { newId } from "./ids";
import type { Role, User } from "./types";

export function listUsers(): User[] {
  return getDb()
    .prepare("SELECT * FROM users ORDER BY created_at ASC, display_name ASC")
    .all() as User[];
}

export function countUsers(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM users")
    .get() as { count: number };
  return row.count;
}

export function getUser(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | User
    | undefined;
  return row ?? null;
}

export function getUserByDisplayName(displayName: string): User | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE display_name = ? COLLATE NOCASE")
    .get(displayName) as User | undefined;
  return row ?? null;
}

export function createUser(input: { displayName: string; role: Role }): User {
  const user: User = {
    id: newId(),
    display_name: input.displayName,
    role: input.role,
    created_at: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `INSERT INTO users (id, display_name, role, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(user.id, user.display_name, user.role, user.created_at);

  return user;
}
