import { z } from "zod";

import {
  administratorSchema,
  appVersionSchema,
  auditEventSchema,
  businessSchema,
  deviceSchema,
  healthIndicatorSchema,
  membershipSchema,
  problemReportSchema,
  stallSchema,
  syncEventSchema,
  systemHealthSchema,
  userSchema,
  type Administrator,
  type AppVersion,
  type AuditEvent,
  type Business,
  type Device,
  type Membership,
  type MockScenario,
  type ProblemReport,
  type Stall,
  type SyncEvent,
  type SystemHealth,
  type User,
} from "./schemas";

export const MOCK_CLOCK_ISO = "2026-07-25T00:00:00.000Z";

const MOCK_CLOCK_MS = Date.parse(MOCK_CLOCK_ISO);
const HOUR_MS = 60 * 60 * 1_000;

const pad = (value: number, width = 3) => String(value).padStart(width, "0");

const hoursAgo = (hours: number) =>
  new Date(MOCK_CLOCK_MS - hours * HOUR_MS).toISOString();

const maskedEmail = (prefix: string, index: number) =>
  `${prefix.slice(0, 1)}***${index % 10}@e******.test`;

const maskedIp = (index: number) => `203.0.${index % 3}.***`;

const mockAdminDataSchema = z
  .object({
    administrators: z.array(administratorSchema),
    users: z.array(userSchema),
    businesses: z.array(businessSchema),
    stalls: z.array(stallSchema),
    devices: z.array(deviceSchema),
    memberships: z.array(membershipSchema),
    syncEvents: z.array(syncEventSchema),
    problemReports: z.array(problemReportSchema),
    appVersions: z.array(appVersionSchema),
    auditEvents: z.array(auditEventSchema),
    systemHealth: systemHealthSchema,
  })
  .strict();

export interface MockAdminData {
  administrators: Administrator[];
  users: User[];
  businesses: Business[];
  stalls: Stall[];
  devices: Device[];
  memberships: Membership[];
  syncEvents: SyncEvent[];
  problemReports: ProblemReport[];
  appVersions: AppVersion[];
  auditEvents: AuditEvent[];
  systemHealth: SystemHealth;
}

interface CoreUser {
  id: string;
  displayName: string;
  emailMasked: string;
  accountStatus: User["accountStatus"];
  createdAt: string;
}

interface CoreBusiness {
  id: string;
  name: string;
  type: Business["type"];
  ownerUserId: string;
  timezone: string;
  status: Business["status"];
  createdAt: string;
}

interface CoreVersion {
  id: string;
  versionName: string;
  versionCode: number;
  releaseChannel: AppVersion["releaseChannel"];
  releasedAt: string;
}

const firstNames = [
  "Lira",
  "Nilo",
  "Amaya",
  "Tomas",
  "Hiraya",
  "Ivo",
  "Sinta",
  "Basil",
  "Diwa",
  "Elio",
  "Tala",
  "Miro",
  "Ligaya",
  "Kiko",
  "Mayari",
  "Pio",
  "Alon",
  "Yumi",
  "Isagani",
  "Naya",
] as const;

const surnames = [
  "Dalisay",
  "Makisig",
  "Silayan",
  "Marilag",
  "Mabini",
  "Malaya",
  "Liwayway",
  "Masinag",
  "Mapili",
  "Payapa",
  "Maharlika",
  "Magiting",
] as const;

const businessNames = [
  "Tala Sari-Sari",
  "Amihan Merienda",
  "Habagat Panaderya",
  "Sinag Kapehan",
  "Mayumi Gulayan",
  "Gintong Ani Bigasan",
  "Dalisay Lutong Bahay",
  "Hiraya Handicrafts",
  "Alon Isda at Laman-Dagat",
  "Liwayway Mini Mart",
  "Bituin Almusal",
  "Mabini Meryenda Corner",
  "Siklab Ihawan",
  "Pahiyas Pasalubong",
  "Luntian Prutas",
  "Harana Kakanin",
  "Timpla at Tinapay",
  "Masinag Tindahan",
  "Salinlahi Crafts",
  "Ginhawa Carinderia",
  "Dapithapon Cafe",
  "Lakbay Souvenirs",
  "Bukang-Liwayway Bakery",
  "Balai Munting Gawa",
  "Sariwa Market Goods",
  "Kislap General Merchandise",
  "Munting Hardin",
  "Bayanihan Repair Hub",
  "Parol Specialty Shop",
  "Lasa ng Nayon",
  "Puno at Palay",
  "Agos Refreshments",
  "Likha Local Finds",
  "Duyan Daily Needs",
  "Tahanan Essentials",
] as const;

const locationNames = [
  "Quezon City",
  "Pasig",
  "Marikina",
  "Mandaluyong",
  "Makati",
  "Taguig",
  "Caloocan",
  "Valenzuela",
  "Antipolo",
  "Cainta",
  "San Pedro",
  "Santa Rosa",
  "Dasmarinas",
  "Imus",
  "Bacoor",
  "Malolos",
  "Meycauayan",
  "San Fernando",
  "Angeles",
  "Lipa",
  "Batangas City",
  "Lucena",
  "Naga",
  "Legazpi",
  "Iloilo City",
  "Bacolod",
  "Cebu City",
  "Mandaue",
  "Lapu-Lapu",
  "Dumaguete",
  "Tacloban",
  "Cagayan de Oro",
  "Davao City",
  "General Santos",
  "Butuan",
] as const;

const deviceCatalog = [
  {
    manufacturer: "Samsung",
    model: "Galaxy A04e",
    androidVersion: "13",
    performanceTier: "low_end" as const,
  },
  {
    manufacturer: "OPPO",
    model: "A16",
    androidVersion: "12",
    performanceTier: "low_end" as const,
  },
  {
    manufacturer: "vivo",
    model: "Y02",
    androidVersion: "12 Go",
    performanceTier: "low_end" as const,
  },
  {
    manufacturer: "Nokia",
    model: "C12",
    androidVersion: "13 Go",
    performanceTier: "low_end" as const,
  },
  {
    manufacturer: "realme",
    model: "C55",
    androidVersion: "14",
    performanceTier: "mid_range" as const,
  },
  {
    manufacturer: "Samsung",
    model: "Galaxy A24",
    androidVersion: "14",
    performanceTier: "mid_range" as const,
  },
  {
    manufacturer: "Xiaomi",
    model: "Redmi Note 12",
    androidVersion: "14",
    performanceTier: "mid_range" as const,
  },
  {
    manufacturer: "Google",
    model: "Pixel 7a",
    androidVersion: "15",
    performanceTier: "high_end" as const,
  },
] as const;

const versionSeeds: readonly CoreVersion[] = [
  {
    id: "version-001",
    versionName: "1.6.0",
    versionCode: 10_600,
    releaseChannel: "production",
    releasedAt: "2025-07-15T00:00:00.000Z",
  },
  {
    id: "version-002",
    versionName: "1.7.2",
    versionCode: 10_702,
    releaseChannel: "production",
    releasedAt: "2025-10-02T00:00:00.000Z",
  },
  {
    id: "version-003",
    versionName: "1.8.5",
    versionCode: 10_805,
    releaseChannel: "production",
    releasedAt: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "version-004",
    versionName: "1.9.0",
    versionCode: 10_900,
    releaseChannel: "production",
    releasedAt: "2026-03-05T00:00:00.000Z",
  },
  {
    id: "version-005",
    versionName: "2.0.0",
    versionCode: 20_000,
    releaseChannel: "production",
    releasedAt: "2026-04-18T00:00:00.000Z",
  },
  {
    id: "version-006",
    versionName: "2.0.4",
    versionCode: 20_004,
    releaseChannel: "production",
    releasedAt: "2026-05-26T00:00:00.000Z",
  },
  {
    id: "version-007",
    versionName: "2.1.0",
    versionCode: 20_100,
    releaseChannel: "production",
    releasedAt: "2026-07-08T00:00:00.000Z",
  },
  {
    id: "version-008",
    versionName: "2.2.0-beta.1",
    versionCode: 20_200,
    releaseChannel: "open",
    releasedAt: "2026-07-20T00:00:00.000Z",
  },
];

const buildAdministrators = (): Administrator[] => {
  const records: Administrator[] = [
    {
      id: "admin-001",
      displayName: "Ari Villanueva",
      emailMasked: maskedEmail("ari", 1),
      role: "super_admin",
      status: "active",
    },
    {
      id: "admin-002",
      displayName: "Mika Alvero",
      emailMasked: maskedEmail("mika", 2),
      role: "super_admin",
      status: "active",
    },
    {
      id: "admin-003",
      displayName: "Cielo Manalo",
      emailMasked: maskedEmail("cielo", 3),
      role: "support_admin",
      status: "active",
    },
    {
      id: "admin-004",
      displayName: "Berto Sandejas",
      emailMasked: maskedEmail("berto", 4),
      role: "support_admin",
      status: "active",
    },
    {
      id: "admin-005",
      displayName: "Nami Rosales",
      emailMasked: maskedEmail("nami", 5),
      role: "support_admin",
      status: "active",
    },
    {
      id: "admin-006",
      displayName: "Igan Mercado",
      emailMasked: maskedEmail("igan", 6),
      role: "operations_viewer",
      status: "active",
    },
    {
      id: "admin-007",
      displayName: "Raya Salvador",
      emailMasked: maskedEmail("raya", 7),
      role: "operations_viewer",
      status: "active",
    },
    {
      id: "admin-008",
      displayName: "Olan Castillo",
      emailMasked: maskedEmail("olan", 8),
      role: "operations_viewer",
      status: "inactive",
    },
  ];

  return administratorSchema.array().parse(records);
};

const buildCoreUsers = (): CoreUser[] =>
  Array.from({ length: 120 }, (_, index) => ({
    id: `user-${pad(index + 1)}`,
    displayName: `${firstNames[index % firstNames.length]} ${
      surnames[Math.floor(index / firstNames.length) % surnames.length]
    }`,
    emailMasked: maskedEmail("user", index + 1),
    accountStatus:
      index % 29 === 0
        ? "suspended"
        : index % 19 === 0
          ? "disabled"
          : index % 13 === 0
            ? "invited"
            : "active",
    createdAt: hoursAgo(24 * (40 + index)),
  }));

const buildCoreBusinesses = (users: CoreUser[]): CoreBusiness[] => {
  const types: Business["type"][] = [
    "sari_sari_store",
    "karinderia",
    "market_vendor",
    "kiosk",
    "food_seller",
    "other",
  ];

  return businessNames.map((name, index) => ({
    id: `business-${pad(index + 1)}`,
    name,
    type: types[index % types.length],
    ownerUserId: users[index].id,
    timezone: "Asia/Manila",
    status:
      index % 29 === 0
        ? "suspended"
        : index % 17 === 0
          ? "under_review"
          : index % 23 === 0
            ? "inactive"
            : "active",
    createdAt: hoursAgo(24 * (120 + index * 3)),
  }));
};

const buildStalls = (businesses: CoreBusiness[]): Stall[] =>
  stallSchema.array().parse(
    Array.from({ length: 60 }, (_, index) => {
      const businessIndex = index < businesses.length ? index : index - 35;
      const business = businesses[businessIndex];
      const stallNumber = index < businesses.length ? 1 : 2;

      return {
        id: `stall-${pad(index + 1)}`,
        businessId: business.id,
        businessName: business.name,
        name: `${business.name} - Stall ${stallNumber}`,
        locationLabel: `${locationNames[businessIndex % locationNames.length]} ${
          stallNumber === 1 ? "Pamilihan" : "Barangay Center"
        }`,
        status: index % 22 === 0 ? "inactive" : "active",
        createdAt: hoursAgo(24 * (95 + index)),
        lastActivityAt: index % 22 === 0 ? null : hoursAgo((index % 36) + 2),
      };
    }),
  );

const buildMemberships = (
  users: CoreUser[],
  businesses: CoreBusiness[],
  stalls: Stall[],
): Membership[] => {
  const memberships: Membership[] = [];

  businesses.forEach((business, businessIndex) => {
    const businessStalls = stalls.filter(
      (stall) => stall.businessId === business.id,
    );

    memberships.push({
      id: `membership-${pad(memberships.length + 1)}`,
      userId: business.ownerUserId,
      userName: users[businessIndex].displayName,
      businessId: business.id,
      businessName: business.name,
      stallId: null,
      stallName: null,
      role: "owner",
      status: "active",
      joinedAt: hoursAgo(24 * (115 + businessIndex)),
    });

    for (let roleIndex = 0; roleIndex < 3; roleIndex += 1) {
      const user = users[(35 + businessIndex * 3 + roleIndex) % users.length];
      const stall = businessStalls[roleIndex % businessStalls.length] ?? null;
      memberships.push({
        id: `membership-${pad(memberships.length + 1)}`,
        userId: user.id,
        userName: user.displayName,
        businessId: business.id,
        businessName: business.name,
        stallId: stall?.id ?? null,
        stallName: stall?.name ?? null,
        role: roleIndex === 0 ? "manager" : "seller",
        status: (businessIndex + roleIndex) % 31 === 0 ? "invited" : "active",
        joinedAt: hoursAgo(24 * (80 + businessIndex + roleIndex)),
      });
    }
  });

  return membershipSchema.array().parse(memberships);
};

const buildDevices = (
  scenario: MockScenario,
  businesses: CoreBusiness[],
  stalls: Stall[],
  memberships: Membership[],
): Device[] => {
  const defaultVersionIndexes = [6, 6, 5, 6, 4, 5, 3, 6, 2, 7] as const;

  return deviceSchema.array().parse(
    Array.from({ length: 90 }, (_, index) => {
      const business = businesses[index % businesses.length];
      const businessMemberships = memberships.filter(
        (membership) =>
          membership.businessId === business.id &&
          membership.status === "active",
      );
      const membership =
        businessMemberships[index % businessMemberships.length];
      const businessStalls = stalls.filter(
        (stall) => stall.businessId === business.id,
      );
      const stall = businessStalls[index % businessStalls.length] ?? null;
      const catalogItem = deviceCatalog[index % deviceCatalog.length];
      const versionIndex =
        scenario === "outdated_version_spike" && index < 72
          ? index % 4
          : defaultVersionIndexes[index % defaultVersionIndexes.length];

      return {
        id: `device-${pad(index + 1)}`,
        deviceIdentifierMasked: `KM-DEV-****-${pad(index + 1, 4)}`,
        userId: membership.userId,
        businessId: business.id,
        businessName: business.name,
        stallId: stall?.id ?? null,
        stallName: stall?.name ?? null,
        manufacturer: catalogItem.manufacturer,
        model: catalogItem.model,
        androidVersion: catalogItem.androidVersion,
        performanceTier: catalogItem.performanceTier,
        status: index % 14 === 0 ? "inactive" : "active",
        appVersionId: versionSeeds[versionIndex].id,
        appVersionName: versionSeeds[versionIndex].versionName,
        lastSuccessfulSyncAt:
          index % 14 === 0 || index % 9 === 0
            ? null
            : hoursAgo((index % 48) + 1),
        syncState:
          index % 14 === 0
            ? "stale"
            : index % 11 === 0
              ? "failed"
              : index % 9 === 0
                ? "pending"
                : "healthy",
        registeredAt: hoursAgo(24 * (55 + index)),
        lastSeenAt: index % 14 === 0 ? hoursAgo(24 * 15) : hoursAgo(index % 48),
      };
    }),
  );
};

const buildSyncEvents = (
  scenario: MockScenario,
  devices: Device[],
  businesses: CoreBusiness[],
  stalls: Stall[],
): SyncEvent[] => {
  const errors: NonNullable<SyncEvent["errorType"]>[] = [
    "network_timeout",
    "authentication_expired",
    "payload_validation",
    "version_unsupported",
    "conflict",
    "server_unavailable",
  ];

  return syncEventSchema.array().parse(
    Array.from({ length: 400 }, (_, index) => {
      const device = devices[(index * 7) % devices.length];
      const business = businesses.find(
        (candidate) => candidate.id === device.businessId,
      )!;
      const stall = stalls.find((candidate) => candidate.id === device.stallId);
      const version = versionSeeds.find(
        (candidate) => candidate.id === device.appVersionId,
      )!;
      const normalBucket = index % 10;
      const status: SyncEvent["status"] =
        scenario === "high_sync_failure"
          ? index % 5 === 0
            ? "success"
            : index % 7 === 0
              ? "pending"
              : "failed"
          : normalBucket < 7
            ? "success"
            : normalBucket < 9
              ? "failed"
              : "pending";
      const attemptedHoursAgo = 1 + index * 0.45;
      const errorType =
        status === "failed" ? errors[index % errors.length] : null;
      const retryState: SyncEvent["retryState"] =
        status === "success"
          ? "not_required"
          : status === "pending"
            ? index % 2 === 0
              ? "scheduled"
              : "in_progress"
            : index % 3 === 0
              ? "exhausted"
              : "scheduled";
      const state: SyncEvent["state"] =
        errorType === "conflict"
          ? "conflict"
          : status === "pending"
            ? "pending"
            : status === "failed"
              ? retryState === "scheduled"
                ? "retrying"
                : "failed"
              : attemptedHoursAgo > 150
                ? "stale"
                : "healthy";

      return {
        id: `sync-${pad(index + 1, 4)}`,
        eventName:
          status === "pending"
            ? "sync.started"
            : status === "success"
              ? "sync.completed"
              : errorType === "conflict"
                ? "sync.conflict_detected"
                : "sync.failed",
        deviceId: device.id,
        deviceIdentifierMasked: device.deviceIdentifierMasked,
        userId: device.userId,
        businessId: business.id,
        businessName: business.name,
        stallId: stall?.id ?? null,
        stallName: stall?.name ?? null,
        appVersionId: version.id,
        appVersionName: version.versionName,
        appVersionCode: version.versionCode,
        platform: "android",
        source: "android_client",
        state,
        status,
        retryState,
        occurredAt: hoursAgo(attemptedHoursAgo),
        syncedAt: status === "success" ? hoursAgo(attemptedHoursAgo) : null,
        errorType,
        conflictStatus:
          errorType === "conflict"
            ? index % 2 === 0
              ? "detected"
              : "resolved"
            : "none",
        recordsProcessed: status === "success" ? 8 + ((index * 13) % 180) : 0,
        ipAddressMasked: maskedIp(index),
        correlationId: `sync-corr-${pad(index + 1, 5)}`,
      };
    }),
  );
};

const buildUsers = (
  coreUsers: CoreUser[],
  memberships: Membership[],
  businesses: CoreBusiness[],
  devices: Device[],
): User[] =>
  userSchema.array().parse(
    coreUsers.map((user) => {
      const userMemberships = memberships.filter(
        (membership) => membership.userId === user.id,
      );
      const userDevices = devices.filter((device) => device.userId === user.id);
      const currentDevice = [...userDevices].sort((left, right) =>
        (right.lastSeenAt ?? "").localeCompare(left.lastSeenAt ?? ""),
      )[0];

      return {
        ...user,
        membershipRoles: [
          ...new Set(userMemberships.map((membership) => membership.role)),
        ],
        businessNames: [
          ...new Set(
            userMemberships.flatMap((membership) => {
              const business = businesses.find(
                (candidate) => candidate.id === membership.businessId,
              );
              return business ? [business.name] : [];
            }),
          ),
        ],
        businessMembershipCount: userMemberships.length,
        deviceCount: userDevices.length,
        currentAppVersionId: currentDevice?.appVersionId ?? null,
        currentAppVersionName: currentDevice?.appVersionName ?? null,
        supportHistoryCount: 0,
        lastActiveAt:
          currentDevice?.lastSeenAt ??
          (user.accountStatus === "invited" ? null : hoursAgo(24 * 8)),
      };
    }),
  );

const applySupportHistoryCounts = (
  users: User[],
  problemReports: ProblemReport[],
): User[] =>
  userSchema.array().parse(
    users.map((user) => ({
      ...user,
      supportHistoryCount: problemReports.filter(
        (report) => report.userId === user.id,
      ).length,
    })),
  );

const buildBusinesses = (
  coreBusinesses: CoreBusiness[],
  coreUsers: CoreUser[],
  stalls: Stall[],
  memberships: Membership[],
  devices: Device[],
  syncEvents: SyncEvent[],
): Business[] =>
  businessSchema.array().parse(
    coreBusinesses.map((business) => {
      const owner = coreUsers.find(
        (candidate) => candidate.id === business.ownerUserId,
      )!;
      const businessMemberships = memberships.filter(
        (membership) => membership.businessId === business.id,
      );
      const businessSyncEvents = syncEvents.filter(
        (event) => event.businessId === business.id,
      );
      const failed = businessSyncEvents.filter(
        (event) => event.status === "failed",
      ).length;
      const attempted = businessSyncEvents.filter(
        (event) => event.status !== "pending",
      ).length;
      const failureRate = attempted === 0 ? 0 : failed / attempted;
      const lastActivity = [...businessSyncEvents].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      )[0]?.occurredAt;

      return {
        ...business,
        ownerName: owner.displayName,
        syncHealth:
          attempted === 0
            ? "unknown"
            : failureRate >= 0.45
              ? "critical"
              : failureRate >= 0.2
                ? "degraded"
                : "healthy",
        stallCount: stalls.filter((stall) => stall.businessId === business.id)
          .length,
        sellerCount: businessMemberships.filter(
          (membership) =>
            membership.role === "seller" && membership.status === "active",
        ).length,
        connectedDeviceCount: devices.filter(
          (device) =>
            device.businessId === business.id && device.status === "active",
        ).length,
        lastActivityAt: lastActivity ?? null,
      };
    }),
  );

const buildProblemReports = (
  users: User[],
  businesses: Business[],
  devices: Device[],
  syncEvents: SyncEvent[],
  administrators: Administrator[],
): ProblemReport[] => {
  const categories: ProblemReport["category"][] = [
    "synchronization",
    "account_access",
    "device_performance",
    "app_crash",
    "data_conflict",
    "other",
  ];
  const severities: ProblemReport["severity"][] = [
    "low",
    "medium",
    "high",
    "critical",
  ];
  const statuses: ProblemReport["status"][] = [
    "new",
    "triaged",
    "in_progress",
    "waiting_for_user",
    "resolved",
    "closed",
  ];
  const titles = [
    "Sync remains queued after reconnecting",
    "Sign-in confirmation is not completing",
    "App slows down during background sync",
    "App closes while sending a report",
    "Conflicting update needs review",
    "Unexpected message shown on device",
  ] as const;

  return problemReportSchema.array().parse(
    Array.from({ length: 45 }, (_, index) => {
      const device = devices[(index * 11) % devices.length];
      const user = users.find((candidate) => candidate.id === device.userId)!;
      const business = businesses.find(
        (candidate) => candidate.id === device.businessId,
      )!;
      const version = versionSeeds.find(
        (candidate) => candidate.id === device.appVersionId,
      )!;
      const admin =
        index % 3 === 0
          ? null
          : administrators[2 + (index % (administrators.length - 2))];
      const status = statuses[index % statuses.length];
      const relatedSyncEvent =
        syncEvents.find(
          (event) => event.deviceId === device.id && event.status !== "success",
        ) ?? null;
      const reportId = `report-${pad(index + 1)}`;

      return {
        id: reportId,
        title: titles[index % titles.length],
        description:
          "Fictional support report captured for mock operational review. No transaction details are included.",
        severity: severities[(index * 3) % severities.length],
        category: categories[index % categories.length],
        status,
        userId: user.id,
        userName: user.displayName,
        businessId: business.id,
        businessName: business.name,
        deviceId: device.id,
        deviceIdentifierMasked: device.deviceIdentifierMasked,
        appVersionId: version.id,
        appVersionName: version.versionName,
        relatedSyncEventId: relatedSyncEvent?.id ?? null,
        submittedAt: hoursAgo(10 + index * 6),
        updatedAt: hoursAgo(5 + index * 4),
        assignedAdminId: admin?.id ?? null,
        assignedAdminName: admin?.displayName ?? null,
        internalNotes:
          index % 5 === 0
            ? []
            : [
                {
                  id: `note-${pad(index + 1)}`,
                  reportId,
                  authorAdminId: administrators[2].id,
                  authorName: administrators[2].displayName,
                  body: "Reviewed the masked device context and requested a fresh synchronization attempt.",
                  createdAt: hoursAgo(7 + index * 4),
                },
              ],
        resolution:
          status === "resolved" || status === "closed"
            ? "Confirmed recovery after the user retried on a stable connection."
            : null,
      };
    }),
  );
};

const buildAppVersions = (
  devices: Device[],
  problemReports: ProblemReport[],
): AppVersion[] => {
  const minimumSupportedCode = 20_000;
  const minimumSupportedVersion = "2.0.0";

  return appVersionSchema.array().parse(
    versionSeeds.map((version) => {
      const activeInstalls = devices.filter(
        (device) =>
          device.appVersionId === version.id && device.status === "active",
      ).length;

      return {
        ...version,
        activeInstalls,
        activeDeviceCount: activeInstalls,
        outdatedDeviceCount:
          version.versionCode < minimumSupportedCode ? activeInstalls : 0,
        issueCount: problemReports.filter(
          (report) => report.appVersionId === version.id,
        ).length,
        crashIndicator:
          problemReports.filter(
            (report) =>
              report.appVersionId === version.id &&
              report.category === "app_crash" &&
              report.status !== "closed",
          ).length >= 5
            ? "critical"
            : problemReports.filter(
                  (report) =>
                    report.appVersionId === version.id &&
                    report.category === "app_crash" &&
                    report.status !== "closed",
                ).length > 0
              ? "elevated"
              : "none",
        minimumSupportedVersion,
        isMinimumSupported: version.versionCode === minimumSupportedCode,
        isSupported: version.versionCode >= minimumSupportedCode,
      };
    }),
  );
};

const buildAuditEvents = (
  administrators: Administrator[],
  users: User[],
  businesses: Business[],
  problemReports: ProblemReport[],
  syncEvents: SyncEvent[],
): AuditEvent[] => {
  const targetTypes: AuditEvent["targetType"][] = [
    "user",
    "business",
    "problem_report",
    "sync_event",
    "app_version",
    "system",
  ];

  return auditEventSchema.array().parse(
    Array.from({ length: 150 }, (_, index) => {
      const actor = administrators[index % administrators.length];
      const targetType = targetTypes[index % targetTypes.length];
      const target =
        targetType === "user"
          ? users[index % users.length]
          : targetType === "business"
            ? businesses[index % businesses.length]
            : targetType === "problem_report"
              ? problemReports[index % problemReports.length]
              : targetType === "sync_event"
                ? syncEvents[index % syncEvents.length]
                : targetType === "app_version"
                  ? versionSeeds[index % versionSeeds.length]
                  : { id: "system-health", name: "Platform health" };
      const targetLabel =
        "displayName" in target
          ? target.displayName
          : "versionName" in target
            ? target.versionName
            : "title" in target
              ? target.title
              : "name" in target
                ? target.name
                : target.id;
      const relatedReport =
        targetType === "problem_report"
          ? problemReports[index % problemReports.length]
          : null;
      const relatedSync =
        targetType === "sync_event"
          ? syncEvents[index % syncEvents.length]
          : relatedReport?.relatedSyncEventId
            ? (syncEvents.find(
                (event) => event.id === relatedReport.relatedSyncEventId,
              ) ?? null)
            : null;
      const relatedVersion =
        targetType === "app_version"
          ? versionSeeds[index % versionSeeds.length]
          : relatedReport
            ? (versionSeeds.find(
                (version) => version.id === relatedReport.appVersionId,
              ) ?? null)
            : relatedSync
              ? (versionSeeds.find(
                  (version) => version.id === relatedSync.appVersionId,
                ) ?? null)
              : null;
      const outcome: AuditEvent["outcome"] =
        index % 29 === 0 ? "denied" : "succeeded";

      return {
        id: `audit-${pad(index + 1, 4)}`,
        actorUserId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        action:
          targetType === "problem_report"
            ? "problem_report.reviewed"
            : targetType === "sync_event"
              ? "sync.inspected"
              : targetType === "system"
                ? "system.health_checked"
                : targetType === "app_version"
                  ? "app_version.viewed"
                  : targetType === "business"
                    ? "business.viewed"
                    : "user.viewed",
        targetType,
        targetId: target.id,
        targetLabel,
        businessId:
          targetType === "business"
            ? target.id
            : (relatedReport?.businessId ?? relatedSync?.businessId ?? null),
        stallId: relatedSync?.stallId ?? null,
        reasonCode:
          outcome === "denied"
            ? "policy_denied"
            : targetType === "system"
              ? "health_review"
              : "routine_review",
        reasonNote: "Routine fictional administrative review in mock mode.",
        beforeState: null,
        afterState: null,
        outcome,
        occurredAt: hoursAgo(12 + index * 1.7),
        sourceIpMasked: maskedIp(index + 30),
        deviceId: relatedReport?.deviceId ?? relatedSync?.deviceId ?? null,
        appVersionCode: relatedVersion?.versionCode ?? null,
        correlationId: `corr-mock-${pad(index + 1, 5)}`,
      };
    }),
  );
};

const buildSystemHealth = (scenario: MockScenario): SystemHealth => {
  const maintenance = scenario === "maintenance";
  const highFailure = scenario === "high_sync_failure";
  const backendUnavailable = scenario === "backend_unavailable";
  const partialFailure = scenario === "partial_failure";
  const staleData = scenario === "stale_data";
  const checkedAt = scenario === "stale_data" ? hoursAgo(24) : MOCK_CLOCK_ISO;
  const indicators = healthIndicatorSchema.array().parse([
    {
      id: "health-admin-web",
      name: "Admin web application",
      status: maintenance ? "maintenance" : "healthy",
      latencyMs: maintenance ? null : 84,
      message: maintenance
        ? "The fictional maintenance window is active."
        : "Requests are completing normally.",
      checkedAt,
    },
    {
      id: "health-api",
      name: "Administrative API",
      status: backendUnavailable
        ? "outage"
        : maintenance
          ? "maintenance"
          : "healthy",
      latencyMs: backendUnavailable || maintenance ? null : 126,
      message: backendUnavailable
        ? "The mock backend is unavailable."
        : maintenance
          ? "Administrative API access is paused for maintenance."
          : "API validation and response checks are healthy.",
      checkedAt,
    },
    {
      id: "health-sync",
      name: "Synchronization processing",
      status: highFailure
        ? "outage"
        : maintenance
          ? "maintenance"
          : partialFailure || staleData
            ? "degraded"
            : "healthy",
      latencyMs: maintenance
        ? null
        : highFailure
          ? 3_200
          : partialFailure || staleData
            ? 680
            : 210,
      message: highFailure
        ? "A mock spike in failed synchronization attempts is active."
        : maintenance
          ? "Synchronization review is paused for maintenance."
          : partialFailure || staleData
            ? "Some retry queues are taking longer than expected."
            : "Synchronization processing is operating normally.",
      checkedAt,
    },
    {
      id: "health-report-intake",
      name: "Problem report intake",
      status: maintenance ? "maintenance" : "healthy",
      latencyMs: maintenance ? null : 144,
      message: maintenance
        ? "Problem report intake is paused for maintenance."
        : "Problem reports are being accepted.",
      checkedAt,
    },
    {
      id: "health-audit",
      name: "Audit event pipeline",
      status: maintenance ? "maintenance" : "healthy",
      latencyMs: maintenance ? null : 52,
      message: maintenance
        ? "Audit reads are paused; no records are being removed."
        : "Audit events are being recorded.",
      checkedAt,
    },
  ]);

  return systemHealthSchema.parse({
    overallStatus: backendUnavailable
      ? "outage"
      : maintenance
        ? "maintenance"
        : highFailure
          ? "outage"
          : partialFailure || staleData
            ? "degraded"
            : "healthy",
    checkedAt,
    maintenanceMode: maintenance,
    indicators,
  });
};

export const createMockAdminData = (
  scenario: MockScenario = "normal",
): MockAdminData => {
  const administrators = buildAdministrators();
  const coreUsers = buildCoreUsers();
  const coreBusinesses = buildCoreBusinesses(coreUsers);
  const stalls = buildStalls(coreBusinesses);
  const memberships = buildMemberships(coreUsers, coreBusinesses, stalls);
  const devices = buildDevices(scenario, coreBusinesses, stalls, memberships);
  const syncEvents = buildSyncEvents(scenario, devices, coreBusinesses, stalls);
  let users = buildUsers(coreUsers, memberships, coreBusinesses, devices);
  const businesses = buildBusinesses(
    coreBusinesses,
    coreUsers,
    stalls,
    memberships,
    devices,
    syncEvents,
  );
  const problemReports = buildProblemReports(
    users,
    businesses,
    devices,
    syncEvents,
    administrators,
  );
  users = applySupportHistoryCounts(users, problemReports);
  const appVersions = buildAppVersions(devices, problemReports);
  const auditEvents = buildAuditEvents(
    administrators,
    users,
    businesses,
    problemReports,
    syncEvents,
  );

  return mockAdminDataSchema.parse({
    administrators,
    users,
    businesses,
    stalls,
    devices,
    memberships,
    syncEvents,
    problemReports,
    appVersions,
    auditEvents,
    systemHealth: buildSystemHealth(scenario),
  });
};
