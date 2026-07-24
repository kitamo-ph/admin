export * from "./schemas";
export * from "./service";
export { createMockAdminService, MockAdminService } from "./mock-service";

import { createMockAdminService } from "./mock-service";
import { mockScenarioSchema } from "./schemas";
import type { AdminService } from "./service";

let defaultAdminService: AdminService | undefined;
let defaultAdminServiceConfigKey: string | undefined;

const readServerMockConfig = () => {
  const scenarioValue = process.env.MOCK_ADMIN_SCENARIO;
  const scenarioResult = mockScenarioSchema.safeParse(
    scenarioValue === undefined || scenarioValue === ""
      ? "normal"
      : scenarioValue,
  );
  if (!scenarioResult.success) {
    throw new Error(
      `Invalid MOCK_ADMIN_SCENARIO. Expected one of: ${mockScenarioSchema.options.join(
        ", ",
      )}.`,
    );
  }

  const latencyValue = process.env.MOCK_ADMIN_LATENCY_MS;
  let latencyMs: number | undefined;
  if (latencyValue !== undefined && latencyValue !== "") {
    if (!/^\d+$/.test(latencyValue)) {
      throw new Error(
        "Invalid MOCK_ADMIN_LATENCY_MS. Expected an integer from 0 to 10000.",
      );
    }
    latencyMs = Number(latencyValue);
    if (latencyMs > 10_000) {
      throw new Error(
        "Invalid MOCK_ADMIN_LATENCY_MS. Expected an integer from 0 to 10000.",
      );
    }
  }

  return {
    scenario: scenarioResult.data,
    latencyMs,
    cacheKey: `${scenarioResult.data}:${latencyMs ?? "default"}`,
  };
};

/**
 * Application-facing service accessor. UI code should use this boundary and
 * must not import the private mock seed module.
 */
export const getAdminService = (): AdminService => {
  if (typeof window !== "undefined") {
    throw new Error(
      "getAdminService() is server-only. Browser code must use a validated server action or API boundary.",
    );
  }

  const config = readServerMockConfig();
  if (
    defaultAdminService === undefined ||
    defaultAdminServiceConfigKey !== config.cacheKey
  ) {
    defaultAdminService = createMockAdminService({
      scenario: config.scenario,
      ...(config.latencyMs === undefined
        ? {}
        : { latencyMs: config.latencyMs }),
    });
    defaultAdminServiceConfigKey = config.cacheKey;
  }

  return defaultAdminService;
};
