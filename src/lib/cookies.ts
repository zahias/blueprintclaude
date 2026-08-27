import type { NextResponse } from "next/server";

export const ROLE_COOKIE_NAMES = ["admin_token", "coordinator_token", "instructor_token"] as const;
export type RoleCookieName = (typeof ROLE_COOKIE_NAMES)[number];

export function clearRoleCookies(response: NextResponse, except?: RoleCookieName) {
  ROLE_COOKIE_NAMES.forEach((name) => {
    if (name === except) return;
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  });
}
