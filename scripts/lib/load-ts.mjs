/**
 * Compiles a TypeScript module out of src/lib and returns its exports.
 *
 * Three scripts need rules that ship in src/lib - the withdrawn-set generator,
 * the withdrawal assertion, and the setup-checklist assertion. All three must
 * run the shipping rule rather than a copy of it, because a copy is exactly how
 * generated data and the site drift apart.
 *
 * Compiled through a tsconfig that extends the project's, so the `@/*` alias,
 * `resolveJsonModule` and `esModuleInterop` behave as they do in the app. The
 * emit is CommonJS purely because tsc writes extensionless relative specifiers
 * that Node's ESM resolver rejects.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

/**
 * @param {string} root  repo root
 * @param {string} rel   path to the .ts entry, relative to root
 * @returns {{ exports: any, dispose: () => void }}
 */
export function loadTsModule(root, rel) {
  // Emitted inside the repo's node_modules/.cache rather than the OS temp dir:
  // some of these modules now require real packages (commerce.ts pulls in
  // @supabase/supabase-js since product files moved to Storage), and a temp
  // directory outside the tree has no node_modules to resolve them from.
  // Node walks up from here and finds <root>/node_modules.
  const cacheRoot = join(root, "node_modules/.cache");
  mkdirSync(cacheRoot, { recursive: true });
  const outDir = mkdtempSync(join(cacheRoot, "wc-ts-"));
  // The tsconfig lives in the repo so relative "extends", "paths" and the entry
  // path all resolve against the real tree; only the emit goes to the temp dir.
  const cfgPath = join(root, `tsconfig.scripts-${basename(outDir)}.json`);
  writeFileSync(
    cfgPath,
    JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: false,
        emitDeclarationOnly: false,
        incremental: false,
        module: "commonjs",
        moduleResolution: "node",
        target: "es2022",
        outDir,
        rootDir: "./src",
        skipLibCheck: true,
        // Rules under test are plain data transforms; strictness is enforced by
        // the real `tsc --noEmit`, not here.
        strict: false,
        // @types/node is needed: these rules are imported by modules that read
        // `fs` and `process`, and without it every one of those is an error.
        types: ["node"],
      },
      files: [rel],
      include: [],
    }),
  );

  try {
    execFileSync(
      process.execPath,
      [join(root, "node_modules/typescript/bin/tsc"), "--project", cfgPath],
      { stdio: "pipe", cwd: root },
    );
  } catch (e) {
    // tsc emits JavaScript even when it reports type errors, and anything
    // reported here comes from a module pulled in transitively rather than from
    // the rule being loaded. Fail only if nothing came out.
    if (!existsSync(join(outDir, relative("src", rel).replace(/\.ts$/, ".js")))) {
      rmSync(outDir, { recursive: true, force: true });
      rmSync(cfgPath, { force: true });
      throw new Error(`could not compile ${rel}:\n${e.stdout?.toString() ?? e.message}`);
    }
  }
  rmSync(cfgPath, { force: true });

  const req = createRequire(pathToFileURL(join(outDir, "_.cjs")).href);
  // rootDir is ./src, so "src/lib/x.ts" emits to "<outDir>/lib/x.js".
  const emitted = join(outDir, relative("src", rel).replace(/\.ts$/, ".js"));
  const exports = req(emitted);
  return { exports, dispose: () => rmSync(outDir, { recursive: true, force: true }) };
}
