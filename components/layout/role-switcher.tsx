"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { switchDevelopmentRole } from "@/app/sign-in/actions";
import type { AdminRole } from "@/lib/auth";

const roleOptions: Array<{ value: AdminRole; label: string }> = [
  { value: "super_admin", label: "Super admin" },
  { value: "support_admin", label: "Support admin" },
  { value: "operations_viewer", label: "Operations viewer" },
];

export function RoleSwitcher({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = `${pathname}${
    searchParams.size ? `?${searchParams.toString()}` : ""
  }`;

  return (
    <form action={switchDevelopmentRole} className="hidden sm:block">
      <label className="sr-only" htmlFor="development-role">
        Development role
      </label>
      <input name="returnTo" type="hidden" value={returnTo} />
      <select
        className="control max-w-48 text-sm font-semibold text-[#173f30]"
        defaultValue={role}
        id="development-role"
        name="role"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        title="Development-only role switcher"
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="sr-only">Development-only control</span>
    </form>
  );
}
