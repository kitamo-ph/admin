import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const forbiddenNames = [
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_WEBHOOK_SIGNING_SECRET",
];

/**
 * ADM-048: no service-role key exists in this repo. Application code and the
 * env example may not even name one (the Core adapter uses the admin's own
 * token with the anon key).
 */
const serviceRolePattern = /service_role/i;
const serviceRoleScopes = ["app/", "lib/", "components/"];
const serviceRoleFiles = new Set([
  "proxy.ts",
  "next.config.ts",
  ".env.example",
  "vitest.config.ts",
  "playwright.config.ts",
]);

const secretValuePatterns = [
  /sk_(?:live|test)_[A-Za-z0-9]{16,}/,
  /sk_(?:proj|org)-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/,
];

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  {
    encoding: "utf8",
  },
)
  .split("\n")
  .filter(Boolean)
  .filter(
    (file) =>
      !file.endsWith("package-lock.json") &&
      !file.startsWith("scripts/check-client-secrets"),
  );

const findings = [];

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const name of forbiddenNames) {
    if (content.includes(name)) {
      findings.push(`${file}: forbidden browser-exposed secret name ${name}`);
    }
  }

  if (
    (serviceRoleFiles.has(file) ||
      serviceRoleScopes.some((scope) => file.startsWith(scope))) &&
    serviceRolePattern.test(content)
  ) {
    findings.push(
      `${file}: names a service-role key; ADM-048 allows none in this repository`,
    );
  }

  for (const pattern of secretValuePatterns) {
    if (pattern.test(content)) {
      findings.push(`${file}: value resembles a committed credential`);
    }
  }
}

if (findings.length > 0) {
  console.error("Secret boundary check failed:\n" + findings.join("\n"));
  process.exit(1);
}

console.log(`Secret boundary check passed (${files.length} files inspected).`);
