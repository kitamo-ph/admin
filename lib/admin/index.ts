export * from "./schemas";
export * from "./service";
export * from "./r16-schemas";
export { createMockAdminService, MockAdminService } from "./mock-service";
export {
  CORE_READ_RPCS,
  CORE_WRITE_RPCS,
  CoreAdminService,
  coreConnectionFromEnv,
  createCoreAdminService,
} from "./core-service";

import { coreConnectionFromEnv, createCoreAdminService } from "./core-service";
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

export class AdminServiceUnavailableError extends Error {
  constructor() {
    super("The admin site's data source is not configured.");
    this.name = "AdminServiceUnavailableError";
  }
}

/**
 * Application-facing service accessor. UI code should use this boundary and
 * must not import the private mock seed module.
 *
 * - With the signed-in administrator's aal2 token: the Core adapter
 *   (KITAMO_SUPABASE_URL and KITAMO_SUPABASE_ANON_KEY must be set, else
 *   AdminServiceUnavailableError, which the pages show as /unavailable).
 * - Without a token: the deterministic mock, for development and tests only.
 *   A production runtime never serves mock data (ADM-016/025): it throws.
 */
export const getAdminService = (accessToken?: string): AdminService => {
  if (typeof window !== "undefined") {
    throw new Error(
      "getAdminService() is server-only. Browser code must use a validated server action or API boundary.",
    );
  }

  if (accessToken !== undefined) {
    const connection = coreConnectionFromEnv();
    if (connection === null) throw new AdminServiceUnavailableError();
    return createCoreAdminService({ ...connection, accessToken });
  }

  if (process.env.NODE_ENV === "production") {
    throw new AdminServiceUnavailableError();
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
