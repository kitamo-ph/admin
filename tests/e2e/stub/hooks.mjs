// Node resolve hooks for the e2e stub (tests only): the app's TypeScript
// modules use extensionless relative imports and the "@/" alias, which
// Node's type stripping does not resolve on its own.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../../../", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    return next(withTs(new URL(specifier.slice(2), root).href), context);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:") &&
    !/\.[cm]?[jt]sx?$/.test(specifier)
  ) {
    return next(withTs(new URL(specifier, context.parentURL).href), context);
  }
  return next(specifier, context);
}

function withTs(href) {
  const path = fileURLToPath(href);
  for (const candidate of [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return href;
}
