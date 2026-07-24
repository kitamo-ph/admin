import { Suspense } from "react";

import { AdminShell } from "@/components/layout/admin-shell";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import {
  ADMIN_ROUTE_RULES,
  hasPermission,
  isDevelopmentRoleSwitchingEnabled,
} from "@/lib/auth";
import { requireAdminSession } from "@/lib/auth/server";
import { titleCase } from "@/lib/format";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  const allowedHrefs = ADMIN_ROUTE_RULES.filter(
    (rule) => rule.path !== "/" && hasPermission(session.role, rule.permission),
  ).map((rule) => rule.path);

  return (
    <AdminShell
      adminName={session.displayName}
      allowedHrefs={allowedHrefs}
      roleControl={
        isDevelopmentRoleSwitchingEnabled() ? (
          <Suspense fallback={null}>
            <RoleSwitcher role={session.role} />
          </Suspense>
        ) : null
      }
      roleLabel={titleCase(session.role)}
    >
      {children}
    </AdminShell>
  );
}
