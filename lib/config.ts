import { z } from "zod";

export const appConfig = {
  name: "KitaMo Admin",
  domain: "admin.kitamo.online",
  environment: process.env.NODE_ENV,
  mock: {
    enabled: process.env.NODE_ENV !== "production",
    scenario: process.env.MOCK_ADMIN_FAILURE_MODE ?? "normal",
    latencyMs: z.coerce
      .number()
      .int()
      .min(0)
      .max(10_000)
      .catch(0)
      .parse(process.env.MOCK_ADMIN_LATENCY_MS ?? 0),
  },
  thresholds: {
    staleDeviceHours: 24,
  },
} as const;
