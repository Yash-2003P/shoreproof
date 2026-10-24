"use client";

import { usePathname } from "next/navigation";
import { switchUser } from "@/app/actions";
import type { User } from "@/lib/types";

export function UserSwitcher({
  users,
  currentId,
}: {
  users: User[];
  currentId: string;
}) {
  const pathname = usePathname();

  return (
    <form action={switchUser} className="flex items-center gap-2">
      <label
        htmlFor="user-switcher"
        className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-muted sm:inline"
      >
        Acting as
      </label>
      <select
        id="user-switcher"
        name="userId"
        defaultValue={currentId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-8 max-w-[10rem] border border-line bg-paper px-2 font-mono text-[11px] text-ink"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.display_name}
          </option>
        ))}
      </select>
      <input type="hidden" name="next" value={pathname} />
      <noscript>
        <button type="submit" className="btn btn-ghost h-8 min-h-8 px-2">
          Switch
        </button>
      </noscript>
    </form>
  );
}
