import type { Metadata } from "next";

import { StateBanner } from "@/components/ui/primitives";
import { KeyValueGrid, PageHeader, Panel } from "@/components/ui/primitives";
import { requireAdminPermission } from "@/lib/auth/server";
import { appConfig } from "@/lib/config";
import { titleCase } from "@/lib/format";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await requireAdminPermission("settings:read", "/settings");

  return (
    <div className="admin-page">
      <PageHeader
        description="A read-only record of the current mock environment and future platform configuration boundaries."
        eyebrow="Administration"
        title="Settings"
      />

      <StateBanner tone="warning" title="Configuration is read-only">
        No control on this page changes production behavior, role assignments,
        minimum versions, or merchant accounts.
      </StateBanner>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Panel
          description="Safe, non-secret runtime information"
          title="Environment"
        >
          <KeyValueGrid
            items={[
              {
                label: "Application",
                value: appConfig.name,
              },
              {
                label: "Environment",
                value: titleCase(appConfig.environment),
              },
              {
                label: "Data source",
                value: "Mock admin service",
              },
              {
                label: "Mock scenario",
                value: titleCase(appConfig.mock.scenario),
              },
              {
                label: "Artificial delay",
                value: `${appConfig.mock.latencyMs} ms`,
              },
              {
                label: "Target domain",
                value: appConfig.domain,
              },
            ]}
          />
        </Panel>

        <Panel
          description="Integrations planned for a later approved phase"
          title="Service readiness"
        >
          <div className="grid gap-0 p-2">
            {[
              ["Administrator identity", "Clerk not connected"],
              ["Operational database", "Supabase not connected"],
              ["Monitoring provider", "Not selected"],
              ["Minimum app version", "Placeholder only"],
            ].map(([label, value]) => (
              <div
                className="flex items-center justify-between gap-4 border-b border-[#edf0ed] px-3 py-3 last:border-0"
                key={label}
              >
                <span className="text-sm text-[#4f5a53]">{label}</span>
                <span className="text-right text-xs font-semibold text-[#69736d]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-2"
          description="Visible for architectural review; unavailable for modification"
          title="Future controls"
        >
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Maintenance state",
              "Minimum supported version",
              "Feature rollout",
              "Administrator role assignments",
              "Account lifecycle controls",
              "Monitoring integration",
            ].map((label) => (
              <label
                className="flex min-h-12 cursor-not-allowed items-center gap-3 rounded-lg border border-[#e3e7e3] bg-[#f8f8f5] px-3 text-sm text-[#69736d]"
                key={label}
              >
                <input disabled type="checkbox" />
                {label}
              </label>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
