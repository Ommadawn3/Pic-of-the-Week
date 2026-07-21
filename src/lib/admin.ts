import { createHash } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "pow_admin";

function tokenFor(password: string): string {
  return createHash("sha256").update(`pow:${password}`).digest("hex");
}

/** The token a valid admin cookie must hold (derived from the env password). */
export function expectedToken(): string | null {
  const pw = process.env.ADMIN_DASHBOARD_PASSWORD;
  return pw ? tokenFor(pw) : null;
}

export function passwordMatches(password: string): boolean {
  const pw = process.env.ADMIN_DASHBOARD_PASSWORD;
  return !!pw && password === pw;
}

export async function isAdmin(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const store = await cookies();
  return store.get(COOKIE)?.value === expected;
}

export async function setAdminCookie() {
  const expected = expectedToken();
  if (!expected) return;
  const store = await cookies();
  store.set(COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}
