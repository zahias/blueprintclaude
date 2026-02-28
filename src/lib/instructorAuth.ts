import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export interface InstructorPayload {
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

export function signInstructorToken(payload: InstructorPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyInstructorToken(token: string): InstructorPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as InstructorPayload;
  } catch {
    return null;
  }
}

export async function getInstructorFromCookies(): Promise<InstructorPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("instructor_token")?.value;
  if (!token) return null;
  return verifyInstructorToken(token);
}
