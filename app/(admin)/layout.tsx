import { closeAccessAction } from "@/app/(admin)/access-actions";
import { AccessBanner } from "@/components/admin/access-banner";
import { IdleLock } from "@/components/admin/idle-lock";
import { SignOutButton } from "@/components/auth/mfa-forms";
import { AdminShell } from "@/components/layout/admin-shell";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import {
  ADMIN_ROUTE_RULES,
  hasPermission,
  isDevelopmentRoleSwitchingEnabled,
  isParkedAdminPath,
} from "@/lib/auth";
import { requireAdminContext } from "@/lib/auth/server";
import { titleCase } from "@/lib/format";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, state } = await requireAdminContext();
  const kitamo = session.provider === "kitamo";
  const allowedHrefs = ADMIN_ROUTE_RULES.filter(
    (rule) =>
      rule.path !== "/" &&
      hasPermission(session.role, rule.permission) &&
      // Parked mock-first sections leave the production navigation (ADM-048).
      !(kitamo && isParkedAdminPath(rule.path)),
  ).map((rule) => rule.path);
  const closeRequestIds = Object.fromEntries(
    state.accesses.map((access) => [access.accessId, crypto.randomUUID()]),
  );

  return (
    <AdminShell
      adminName={session.displayName}
      allowedHrefs={allowedHrefs}
      banner={
        <AccessBanner
          accesses={state.accesses}
          closeAction={closeAccessAction}
          closeRequestIds={closeRequestIds}
        />
      }
      kitamo={kitamo}
      roleControl={
        kitamo ? (
          <>
            <IdleLock />
            <SignOutButton className="km-button-secondary km-button-small" />
          </>
        ) : isDevelopmentRoleSwitchingEnabled() ? (
          <RoleSwitcher role={session.role} />
        ) : null
      }
      roleLabel={kitamo ? "KitaMo admin" : titleCase(session.role)}
    >
      {children}
    </AdminShell>
  );
}
