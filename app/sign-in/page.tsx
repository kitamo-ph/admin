import type { Metadata } from "next";

import { PublicShell } from "@/components/layout/public-shell";
import {
  ADMIN_ROLES,
  isDevelopmentRoleSwitchingEnabled,
  type AdminRole,
} from "@/lib/auth";
import { titleCase } from "@/lib/format";

import { signInWithDevelopmentRole } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
};

const roleDescriptions: Record<AdminRole, string> = {
  super_admin: "All mock read capabilities and safe report workflow updates.",
  support_admin: "Support views and safe problem-report workflow updates.",
  operations_viewer: "Read-only operational visibility with masked user data.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo = "/overview" } = await searchParams;
  const switchingEnabled = isDevelopmentRoleSwitchingEnabled();

  return (
    <PublicShell
      eyebrow={switchingEnabled ? "Development access" : "Administrator access"}
      title="Sign in to KitaMo Admin"
      description={
        switchingEnabled
          ? "Choose a fictional administrator role to review the mock-first platform. This authentication shell is available only during local development."
          : "Production authentication is not connected in this mock-first iteration. Clerk will be integrated at this server-side boundary."
      }
    >
      {switchingEnabled ? (
        <>
          <div className="mb-5 rounded-xl border border-[#eedcae] bg-[#fff7e5] px-4 py-3 text-sm text-[#79530d]">
            Development-only access · No real account or merchant data
          </div>
          <div className="grid gap-3">
            {ADMIN_ROLES.map((role) => (
              <form action={signInWithDevelopmentRole} key={role}>
                <input name="returnTo" type="hidden" value={returnTo} />
                <input name="role" type="hidden" value={role} />
                <button
                  className="group flex w-full items-center justify-between gap-4 rounded-xl border border-[#dfe4df] bg-[#fffefa] p-4 text-left shadow-[var(--shadow-card)] transition hover:border-[#aeb9b0] hover:bg-white"
                  type="submit"
                >
                  <span>
                    <span className="block font-semibold text-[#173f30]">
                      {titleCase(role)}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[#69736d]">
                      {roleDescriptions[role]}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e3efe8] font-bold text-[#1e513d] transition group-hover:bg-[#d3a33f] group-hover:text-[#102f24]"
                  >
                    →
                  </span>
                </button>
              </form>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-[#dfe4df] bg-[#fffefa] p-5 shadow-[var(--shadow-card)]">
          <p className="font-semibold text-[#173f30]">
            Clerk connection pending
          </p>
          <p className="mt-2 text-sm leading-6 text-[#69736d]">
            This build fails closed. No mock role can be selected or accepted in
            a production runtime.
          </p>
          <button
            className="mt-5 w-full cursor-not-allowed rounded-lg bg-[#dfe4df] px-4 py-2.5 font-semibold text-[#69736d]"
            disabled
            type="button"
          >
            Sign in unavailable
          </button>
        </div>
      )}
      <p className="mt-6 text-center text-xs leading-5 text-[#69736d]">
        Every protected route and mock mutation independently validates the
        active administrator permission.
      </p>
    </PublicShell>
  );
}
