import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Accounts and reference data for the end-to-end suite, from one of two sources:
 *
 * 1. E2E_* environment variables, for an existing backend (e.g. your dev database):
 *      E2E_COADMIN_USER / E2E_COADMIN_PASS / E2E_COMPANY_ID   company admin (required)
 *      E2E_SYSADMIN_USER / E2E_SYSADMIN_PASS                  system admin, not admin of that company (optional)
 *      E2E_FACILITY_TYPE / E2E_VALUE_CHAIN                    names the facilities spec picks
 * 2. .playwright/seed.json, written by e2e/stack/seed.ts for the disposable stack (`bun run e2e:stack`).
 *    It has every role, so no spec is skipped.
 *
 * Environment variables win when E2E_COADMIN_USER is set.
 */
export type SeedRole = "system-admin" | "company-admin" | "company-user" | "regional-admin" | "inactive";
export type Role = SeedRole;

export type E2ESeed = {
  api: string;
  password: string;
  companyId: number;
  users: Record<SeedRole, { email: string; id: number }>;
  valueChain: string;
  facilityType: string;
};

export type Account = { username: string; password: string };

const SEED_FILE = path.join(process.cwd(), ".playwright", "seed.json");

function seed(): E2ESeed | null {
  if (process.env.E2E_COADMIN_USER || !existsSync(SEED_FILE)) return null;
  return JSON.parse(readFileSync(SEED_FILE, "utf8")) as E2ESeed;
}

const fromEnv: Partial<Record<SeedRole, [string | undefined, string | undefined]>> = {
  "company-admin": [process.env.E2E_COADMIN_USER, process.env.E2E_COADMIN_PASS],
  "system-admin": [process.env.E2E_SYSADMIN_USER, process.env.E2E_SYSADMIN_PASS],
};

/** The account for `role`, or null when this source doesn't provide one. */
export function account(role: Role): Account | null {
  const s = seed();
  if (s) return { username: s.users[role].email, password: s.password };
  const [user, pass] = fromEnv[role] ?? [];
  return user && pass ? { username: user, password: pass } : null;
}

/** The company admin's account and company; throws with a setup hint when neither source is there. */
export function companyAdmin(): Account & { companyId: number } {
  const acc = account("company-admin");
  const companyId = seed()?.companyId ?? (process.env.E2E_COMPANY_ID ? Number(process.env.E2E_COMPANY_ID) : undefined);
  if (!acc || companyId == null) {
    throw new Error(
      "End-to-end tests need accounts: run `bun run e2e:stack` (disposable seeded backend), or set " +
        "E2E_COADMIN_USER, E2E_COADMIN_PASS and E2E_COMPANY_ID for an existing one (see Testing in README.MD). " +
        "For tests without a backend run `bun run test:ui`.",
    );
  }
  return { ...acc, companyId };
}

/** Names of reference data the specs select in forms. */
export function referenceData() {
  const s = seed();
  return {
    facilityType: s?.facilityType ?? process.env.E2E_FACILITY_TYPE ?? "Washing station",
    valueChain: s?.valueChain ?? process.env.E2E_VALUE_CHAIN ?? "Coffee Value Chain",
  };
}

/** Roles that can log in. "inactive" (registered, not yet activated) is refused by the backend (HTTP 403). */
export const SESSION_ROLES: Role[] = ["system-admin", "company-admin", "company-user", "regional-admin"];

export const storageStatePath = (role: Role) => `.playwright/auth/${role}.json`;
