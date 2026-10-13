import type { Metadata } from "next";

import { KitamoSignInForm } from "@/components/auth/kitamo-sign-in-form";
import { PublicShell } from "@/components/layout/public-shell";
import {
  ADMIN_ROLES,
  isDevelopmentRoleSwitchingEnabled,
  type AdminRole,
} from "@/lib/auth";
import { captchaConfiguration } from "@/lib/auth/kitamo/captcha";
import { safeReturnTo } from "@/lib/auth/kitamo/resolve";
import { authBase } from "@/lib/auth/kitamo/session";
import { titleCase } from "@/lib/format";

import { signInWithDevelopmentRole } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
};

export const dynamic = "force-dynamic";

const WHY: Record<string, string> = {
  idle: "The admin site signed you out after 30 minutes without use. Sign in again.",
  expired: "Your sign-in ended. Sign in again.",
  signed_out: "You signed out.",
};

const roleDescriptions: Record<AdminRole, string> = {
  super_admin: "All mock read capabilities and safe report workflow updates.",
  support_admin: "Support views and safe problem-report workflow updates.",
  operations_viewer: "Read-only operational visibility with masked user data.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; why?: string }>;
}) {
  const { returnTo = "/overview", why } = await searchParams;
  const switchingEnabled = isDevelopmentRoleSwitchingEnabled();
  // KitaMo's Auth (R16, ADM-048): always in production; in development only
  // when KITAMO_SUPABASE_URL and KITAMO_SUPABASE_ANON_KEY are set.
  const kitamoEnabled = !switchingEnabled || authBase() !== null;
  const notice = why === undefined ? undefined : WHY[why];

  return (
    <PublicShell
      eyebrow={switchingEnabled ? "Development access" : "Administrator access"}
      title="Sign in to KitaMo Admin"
      description={
        kitamoEnabled
          ? "For KitaMo's admin account only: its KitaMo email and password, then the code from its authenticator app."
          : "Choose a fictional administrator role to review the mock-first platform. This authentication shell is available only during local development."
      }
    >
      {notice !== undefined ? (
        <p className="km-notice mb-5" role="status">
          {notice}
        </p>
      ) : null}
      {kitamoEnabled ? (
        <div className="mb-8">
          <KitamoSignInForm
            captcha={captchaConfiguration()}
            returnTo={safeReturnTo(returnTo)}
          />
          <p className="km-hint mt-4">
            Every look at a business needs a written reason, lasts at most 30
            minutes, and is shown to that business.
          </p>
        </div>
      ) : null}
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
      ) : null}
      {switchingEnabled ? (
        <p className="mt-6 text-center text-xs leading-5 text-[#69736d]">
          Every protected route and mock mutation independently validates the
          active administrator permission.
        </p>
      ) : null}
    </PublicShell>
  );
}
