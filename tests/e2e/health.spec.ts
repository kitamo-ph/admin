import { expect, test } from "@playwright/test";

test("the public health endpoint returns minimal non-cacheable liveness", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );

  const body: unknown = await response.json();
  expect(body).toMatchObject({
    mode: "mock",
    service: "kitamo-admin",
    status: "ok",
  });
  expect(body).toHaveProperty("checkedAt");
  expect(
    Number.isNaN(Date.parse((body as { checkedAt: string }).checkedAt)),
  ).toBe(false);

  const serialized = JSON.stringify(body).toLowerCase();
  expect(serialized).not.toContain("supabase");
  expect(serialized).not.toContain("clerk");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("service_role");
});
