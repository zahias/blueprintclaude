import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export interface CoordinatorPayload {
  id: string;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signCoordinatorToken(payload: CoordinatorPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyCoordinatorToken(token: string): CoordinatorPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as CoordinatorPayload;
  } catch {
    return null;
  }
}

export async function getCoordinatorFromCookies(): Promise<CoordinatorPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("coordinator_token")?.value;
  if (!token) return null;
  return verifyCoordinatorToken(token);
}
