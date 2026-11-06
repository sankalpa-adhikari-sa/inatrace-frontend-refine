/**
 * Seeds an empty INATrace backend for the end-to-end suite and writes what it created to
 * .playwright/seed.json, which e2e/env.ts reads.
 *
 *   bun e2e/stack/seed.ts            (E2E_API defaults to the stack's http://localhost:18080)
 *
 * Everything goes through the API except one step: an empty database has no administrator, and only an
 * administrator can activate users, so the first system admin is promoted with one SQL statement in the
 * stack's MySQL container. Run it against a fresh database only (`bun run e2e:stack` does).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { E2ESeed, SeedRole } from "../env";

const API = process.env.E2E_API ?? `http://localhost:${process.env.E2E_BACKEND_PORT ?? 18080}`;
const COMPOSE = ["compose", "-p", "inatrace-e2e", "-f", path.join(import.meta.dirname, "compose.yaml")];
const PASSWORD = "e2e-Password-1";
const OUT = path.join(process.cwd(), ".playwright", "seed.json");

const USERS: Record<SeedRole, { email: string; name: string }> = {
  "system-admin": { email: "sysadmin@e2e.test", name: "System" },
  "company-admin": { email: "coadmin@e2e.test", name: "Company" },
  "company-user": { email: "couser@e2e.test", name: "Member" },
  "regional-admin": { email: "regional@e2e.test", name: "Regional" },
  inactive: { email: "inactive@e2e.test", name: "Pending" },
};

/** Minimal API client with a cookie jar (the backend's session lives in cookies). */
class Client {
  private cookies = new Map<string, string>();

  async call<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetch(API + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok || (json && json.status && json.status !== "OK")) {
      throw new Error(`${method} ${url} → HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    return json?.data as T;
  }

  login(email: string) {
    return this.call("POST", "/api/user/login", { username: email, password: PASSWORD });
  }
}

async function waitForBackend(timeoutMs = 300_000) {
  const until = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < until) {
    try {
      const res = await fetch(`${API}/v3/api-docs`);
      if (res.ok) return;
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = (e as Error).message;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Backend at ${API} not ready after ${timeoutMs / 1000}s (${last})`);
}

function sql(statement: string) {
  execFileSync("docker", [...COMPOSE, "exec", "-T", "mysql", "mysql", "-uinatrace", "-pinatrace", "inatrace", "-e", statement], {
    stdio: ["ignore", "inherit", "pipe"],
  });
}

async function main() {
  console.log(`Seeding ${API}`);
  await waitForBackend();
  const anon = new Client();

  // 1. Register everyone (UNCONFIRMED), then make the first system admin by hand.
  for (const [role, u] of Object.entries(USERS)) {
    await anon.call("POST", "/api/user/register", { email: u.email, password: PASSWORD, name: u.name, surname: role, language: "EN" });
  }
  sql(`UPDATE User SET role='SYSTEM_ADMIN', status='ACTIVE' WHERE email='${USERS["system-admin"].email}'`);

  const admin = new Client();
  await admin.login(USERS["system-admin"].email);

  const userId = async (email: string) => {
    const list = await admin.call<{ items: { id: number; email: string }[] }>(
      "GET",
      `/api/user/admin/list?email=${encodeURIComponent(email)}&limit=10`,
    );
    const user = list.items.find((u) => u.email === email);
    if (!user) throw new Error(`user ${email} not found`);
    return user.id;
  };
  const userAction = (action: string, id: number) => admin.call("POST", `/api/user/admin/execute/${action}`, { id });

  const ids = {} as Record<SeedRole, number>;
  for (const [role, u] of Object.entries(USERS) as [SeedRole, { email: string }][]) {
    ids[role] = await userId(u.email);
    if (role === "system-admin") continue;
    await userAction("CONFIRM_USER_EMAIL", ids[role]);
    if (role !== "inactive") await userAction("ACTIVATE_USER", ids[role]); // inactive stays CONFIRMED_EMAIL
  }
  await userAction("SET_USER_REGIONAL_ADMIN", ids["regional-admin"]);

  // 2. Reference data: a product type and a value chain using all seeded facility types / units.
  const productTypeId = await admin.call<number | { id: number }>("POST", "/api/product-type", {
    name: "E2E Coffee",
    code: "E2E_COFFEE",
    description: "Product type for end-to-end tests",
    translations: [{ language: "EN", name: "E2E Coffee", description: "Product type for end-to-end tests" }],
  });
  const ptId = typeof productTypeId === "number" ? productTypeId : productTypeId.id;

  const facilityTypes = await admin.call<{ items: { id: number; label: string }[] }>("GET", "/api/chain/facility-type/list?limit=100");
  const measureUnits = await admin.call<{ items: { id: number }[] }>("GET", "/api/chain/measure-unit-type/list?limit=100");
  const valueChainName = "E2E Coffee Value Chain";
  const valueChain = await admin.call<{ id: number }>("PUT", "/api/chain/value-chain", {
    name: valueChainName,
    description: "Value chain for end-to-end tests",
    productType: { id: ptId },
    facilityTypes: facilityTypes.items.map((f) => ({ id: f.id })),
    measureUnitTypes: measureUnits.items.map((m) => ({ id: m.id })),
  });

  // 3. The company. Creating it makes the creator (system admin) its company admin; demote them to
  //    company user below, so "system admin who isn't a company admin" stays testable.
  const countries = await admin.call<{ items: { id: number; code: string }[] }>("GET", "/api/common/countries?limit=500");
  const rwanda = countries.items.find((c) => c.code === "RW");
  const company = await admin.call<{ id: number }>("POST", "/api/company/create", {
    name: "E2E Cooperative",
    abbreviation: "E2E",
    about: "Company for end-to-end tests",
    email: "coop@e2e.test",
    phone: "+250 000 000",
    headquarters: { address: "Main road 1", city: "Kigali", state: "Kigali", country: rwanda ? { id: rwanda.id } : undefined },
    valueChains: [{ id: valueChain.id }],
  });
  const companyId = company.id;

  const companyAction = (action: string, body: Record<string, unknown>) =>
    admin.call("POST", `/api/company/execute/${action}`, { companyId, ...body });
  await companyAction("ACTIVATE_COMPANY", {}).catch(() => {}); // already active on some versions
  await companyAction("ADD_USER_TO_COMPANY", { userId: ids["company-admin"], companyUserRole: "COMPANY_ADMIN" });
  await companyAction("ADD_USER_TO_COMPANY", { userId: ids["company-user"], companyUserRole: "COMPANY_USER" });
  await companyAction("ADD_USER_TO_COMPANY", { userId: ids["regional-admin"], companyUserRole: "COMPANY_USER" });
  await companyAction("SET_USER_COMPANY_ROLE", { userId: ids["system-admin"], companyUserRole: "COMPANY_USER" });

  const seed: E2ESeed = {
    api: API,
    password: PASSWORD,
    companyId,
    users: Object.fromEntries(Object.entries(USERS).map(([role, u]) => [role, { email: u.email, id: ids[role as SeedRole] }])) as E2ESeed["users"],
    valueChain: valueChainName,
    facilityType: facilityTypes.items.find((f) => f.label === "Washing station")?.label ?? facilityTypes.items[0].label,
  };
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(seed, null, 2));
  console.log(`Seeded company ${companyId}; wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
