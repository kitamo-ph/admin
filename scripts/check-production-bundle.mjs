import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const staticRoot = join(process.cwd(), ".next", "static");

const forbiddenBrowserStrings = [
  "SUPABASE_SERVICE_ROLE_KEY",
  // ADM-048: no service-role key, in any spelling, and no server-only env names.
  "SERVICE_ROLE",
  "service_role",
  "KITAMO_SUPABASE_ANON_KEY",
  "KITAMO_AUTH_TEST_CAPTCHA_TOKEN",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "kitamo_admin_mock_role",
  "MOCK_ADMIN_SCENARIO",
  "MOCK_ADMIN_LATENCY_MS",
  "Development-only role switcher",
  "switchDevelopmentRole",
];

let files;
try {
  files = walk(staticRoot).filter((file) => file.endsWith(".js"));
} catch {
  console.error(
    "Production bundle check requires an existing Next.js production build.",
  );
  process.exit(1);
}

const findings = [];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const forbidden of forbiddenBrowserStrings) {
    if (content.includes(forbidden)) {
      findings.push(
        `${relative(process.cwd(), file)}: contains forbidden browser string ${forbidden}`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error(`Production bundle check failed:\n${findings.join("\n")}`);
  process.exit(1);
}

console.log(
  `Production bundle check passed (${files.length} browser chunks inspected).`,
);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
