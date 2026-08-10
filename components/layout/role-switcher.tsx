import { switchDevelopmentRole } from "@/app/sign-in/actions";
import type { AdminRole } from "@/lib/auth";

const roleOptions: Array<{ value: AdminRole; label: string }> = [
  { value: "super_admin", label: "Super admin" },
  { value: "support_admin", label: "Support admin" },
  { value: "operations_viewer", label: "Operations viewer" },
];

export function RoleSwitcher({ role }: { role: AdminRole }) {
  return (
    <form
      action={switchDevelopmentRole}
      className="hidden items-center gap-2 sm:flex"
    >
      <label className="sr-only" htmlFor="development-role">
        Development role
      </label>
      <input name="returnTo" type="hidden" value="/overview" />
      <select
        className="control max-w-48 text-sm font-semibold text-[#173f30]"
        defaultValue={role}
        id="development-role"
        name="role"
        title="Development-only role switcher"
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        className="min-h-10 rounded-lg border border-[#cbd3cc] bg-white px-3 text-sm font-semibold text-[#173f30] hover:bg-[#f0f6f2]"
        type="submit"
      >
        Switch
      </button>
    </form>
  );
}
