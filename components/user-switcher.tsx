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
        className="hidden text-xs text-muted sm:inline"
      >
        Acting as
      </label>
      <select
        id="user-switcher"
        name="userId"
        defaultValue={currentId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-11 max-w-[9.5rem] rounded-sm border border-line-strong bg-paper px-2.5 text-sm text-ink sm:max-w-[12rem]"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.display_name}
          </option>
        ))}
      </select>
      <input type="hidden" name="next" value={pathname} />
      <noscript>
        <button type="submit" className="btn btn-ghost px-3">
          Switch
        </button>
      </noscript>
    </form>
  );
}
