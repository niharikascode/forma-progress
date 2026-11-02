import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDatabase, LOCAL_USER, seed, type Db } from "./database";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;
import { SESSION_COOKIE } from "./session-cookie";
export { SESSION_COOKIE };
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), 64);
  return timingSafeEqual(expected, actual);
}
function sameSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export interface Account {
  userId: string;
  email: string;
  name: string;
}

/** The original single-user workspace can be claimed once, with the old APP_PASSWORD. */
export async function legacyWorkspaceClaimable(db?: Db) {
  if (!process.env.APP_PASSWORD) return false;
  db ??= await getDatabase();
  return !(await db.get(
    "SELECT userId FROM accounts WHERE userId=?",
    LOCAL_USER,
  ));
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  legacyPassword?: string;
}) {
  const db = await getDatabase();
  const email = input.email.trim().toLowerCase();
  if (await db.get("SELECT userId FROM accounts WHERE email=?", email))
    throw new Error("An account with this email already exists.");
  let userId: string = randomUUID();
  if (input.legacyPassword) {
    const legacy = process.env.APP_PASSWORD;
    if (
      !legacy ||
      !(await legacyWorkspaceClaimable(db)) ||
      !sameSecret(input.legacyPassword, legacy)
    )
      throw new Error("That original workspace password is not valid.");
    userId = LOCAL_USER;
  }
  const passwordHash = await hashPassword(input.password);
  if (userId === LOCAL_USER)
    await db.run("UPDATE users SET name=? WHERE id=?", input.name, userId);
  else
    await db.run("INSERT INTO users(id,name) VALUES (?,?)", userId, input.name);
  await db.run(
    "INSERT INTO accounts(userId,email,passwordHash) VALUES (?,?,?)",
    userId,
    email,
    passwordHash,
  );
  // New accounts start with example projects they can clear in Settings.
  if (userId !== LOCAL_USER) await seed(db, userId);
  await startSession(userId);
}

export async function authenticate(email: string, password: string) {
  const db = await getDatabase();
  const account = (await db.get(
    "SELECT userId,passwordHash FROM accounts WHERE email=?",
    email.trim().toLowerCase(),
  )) as { userId: string; passwordHash: string } | undefined;
  // Hash anyway so response time does not reveal whether the email exists.
  const ok = await verifyPassword(
    password,
    account?.passwordHash ??
      "scrypt$00000000000000000000000000000000$" + "00".repeat(64),
  );
  if (!account || !ok) throw new Error("Incorrect email or password.");
  await startSession(account.userId);
}

async function startSession(userId: string) {
  const db = await getDatabase();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.run(
    "DELETE FROM sessions WHERE expiresAt < ?",
    new Date().toISOString(),
  );
  await db.run(
    "INSERT INTO sessions(tokenHash,userId,expiresAt) VALUES (?,?,?)",
    tokenHash(token),
    userId,
    expires.toISOString(),
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function currentAccount(): Promise<Account | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDatabase();
  const row = (await db.get(
    "SELECT sessions.userId, accounts.email, users.name FROM sessions JOIN accounts ON accounts.userId=sessions.userId JOIN users ON users.id=sessions.userId WHERE sessions.tokenHash=? AND sessions.expiresAt > ?",
    tokenHash(token),
    new Date().toISOString(),
  )) as Account | undefined;
  return row ?? null;
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token)
    await (
      await getDatabase()
    ).run("DELETE FROM sessions WHERE tokenHash=?", tokenHash(token));
  store.delete(SESSION_COOKIE);
}
