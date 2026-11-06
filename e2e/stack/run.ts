/**
 * `bun run e2e:stack [--keep] [playwright args…]`
 *
 * Starts the disposable backend (e2e/stack/compose.yaml), seeds it, runs the end-to-end suite against
 * it and tears everything down again. With --keep the stack and .playwright/seed.json stay, so you can
 * rerun specs quickly (`bun run e2e:stack:test …`) and stop it later (`bun run e2e:stack:down`).
 *
 * The app under test is a separate Vite on E2E_STACK_VITE_PORT (5174) proxying /api to the stack's
 * backend, so a dev server on :5173 (talking to your dev database) is never reused by accident.
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
// Default: the published backend image. E2E_BACKEND_BUILD=1 builds ../inatrace-backend (or BACKEND_DIR) instead.
const BUILD = !!process.env.E2E_BACKEND_BUILD;
const COMPOSE = [
  "compose",
  "-p",
  "inatrace-e2e",
  "-f",
  path.join(HERE, "compose.yaml"),
  ...(BUILD ? ["-f", path.join(HERE, "compose.build.yaml")] : []),
];
const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "18080";
const VITE_PORT = process.env.E2E_STACK_VITE_PORT ?? "5174";
const SEED_FILE = path.join(process.cwd(), ".playwright", "seed.json");

const [command = "all", ...rest] = process.argv.slice(2);
const keep = rest.includes("--keep");
const playwrightArgs = rest.filter((a) => a !== "--keep");

function run(cmd: string, args: string[], env: Record<string, string> = {}) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  return res.status ?? 1;
}

// Pulls images that aren't there yet; rebuilds the local backend image when building.
const up = () => run("docker", [...COMPOSE, "up", "-d", ...(BUILD ? ["--build"] : []), "--wait"]);
const seed = () => run("bun", [path.join(HERE, "seed.ts")], { E2E_API: `http://localhost:${BACKEND_PORT}` });
const test = () =>
  run("bunx", ["playwright", "test", "--project=e2e", ...playwrightArgs], {
    // The seed file is the source of accounts; ignore any E2E_* variables meant for the dev backend.
    E2E_COADMIN_USER: "",
    E2E_PORT: VITE_PORT,
    API_PROXY_TARGET: `http://localhost:${BACKEND_PORT}`,
  });
function down() {
  rmSync(SEED_FILE, { force: true });
  rmSync(path.join(process.cwd(), ".playwright", "auth"), { recursive: true, force: true });
  return run("docker", [...COMPOSE, "down", "-v"]);
}

let status = 0;
switch (command) {
  case "up": // start + seed, leave running
    status = up() || seed();
    break;
  case "test": // run specs against a stack that's already up
    status = test();
    break;
  case "down":
    status = down();
    break;
  default: {
    // Start from nothing even if a previous run was interrupted.
    down();
    status = up() || seed();
    if (status === 0) status = test();
    if (status !== 0) run("docker", [...COMPOSE, "logs", "backend", "--tail", "200"]);
    if (!keep) down();
    else console.log("\nStack kept running: `bun run e2e:stack:test` reruns specs, `bun run e2e:stack:down` stops it.");
  }
}
process.exit(status);
