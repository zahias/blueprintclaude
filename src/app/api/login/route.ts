import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword as verifyAdminPassword, signToken } from "@/lib/auth";
import { verifyPassword as verifyCoordinatorPassword, signCoordinatorToken } from "@/lib/coordinatorAuth";
import { verifyPassword as verifyInstructorPassword, signInstructorToken } from "@/lib/instructorAuth";
import { clearRoleCookies } from "@/lib/cookies";

type LoginRole = "admin" | "coordinator" | "instructor";
type DemoCredential = {
  email: string;
  password: string;
  role: LoginRole;
};

const ROLE_REDIRECTS: Record<LoginRole, string> = {
  admin: "/admin/analytics",
  coordinator: "/coordinator/term-setup",
  instructor: "/instructor",
};

const DEMO_CREDENTIALS: Record<string, DemoCredential> = {
  "admin@blueprint.edu": {
    email: "admin@blueprint.edu",
    password: "admin123",
    role: "admin",
  },
  "coordinator@blueprint.edu": {
    email: "coordinator@blueprint.edu",
    password: "coord123",
    role: "coordinator",
  },
  "instructor@blueprint.edu": {
    email: "instructor@blueprint.edu",
    password: "instructor123",
    role: "instructor",
  },
};

function buildLoginResponse(user: { id: string; email: string; name: string }, role: LoginRole) {
  const token = role === "admin"
    ? signToken(user)
    : role === "coordinator"
      ? signCoordinatorToken(user)
      : signInstructorToken(user);
  const cookieName = role === "admin"
    ? "admin_token"
    : role === "coordinator"
      ? "coordinator_token"
      : "instructor_token";
  const response = NextResponse.json({
    role,
    redirectTo: ROLE_REDIRECTS[role],
    user,
  });

  clearRoleCookies(response, cookieName);
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * (role === "admin" ? 7 : 30),
    path: "/",
  });

  return response;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const demoLogin = process.env.NODE_ENV !== "production" && DEMO_CREDENTIALS[normalizedEmail]?.password === password
      ? DEMO_CREDENTIALS[normalizedEmail]
      : null;

    if (demoLogin) {
      const dbUser = demoLogin.role === "admin"
        ? await prisma.admin.findUnique({ where: { email: demoLogin.email } })
        : demoLogin.role === "coordinator"
          ? await prisma.coordinator.findUnique({ where: { email: demoLogin.email } })
          : await prisma.instructor.findUnique({ where: { email: demoLogin.email } });
      if (!dbUser) {
        return NextResponse.json({ error: "Demo user is missing from the current database. Run the seed first." }, { status: 500 });
      }
      if ("isActive" in dbUser && !dbUser.isActive) {
        return NextResponse.json({ error: "Account is deactivated. Contact your administrator." }, { status: 403 });
      }
      const response = buildLoginResponse({ id: dbUser.id, email: dbUser.email, name: dbUser.name }, demoLogin.role);
      console.info(`[api/login] ${demoLogin.role} demo ${Date.now() - startedAt}ms`);
      return response;
    }

    const [admin, coordinator, instructor] = await Promise.all([
      prisma.admin.findUnique({ where: { email: normalizedEmail } }),
      prisma.coordinator.findUnique({ where: { email: normalizedEmail } }),
      prisma.instructor.findUnique({ where: { email: normalizedEmail } }),
    ]);

    if (admin && await verifyAdminPassword(password, admin.passwordHash)) {
      const response = buildLoginResponse(
        { id: admin.id, email: admin.email, name: admin.name },
        "admin"
      );
      console.info(`[api/login] admin ${Date.now() - startedAt}ms`);
      return response;
    }

    if (coordinator && await verifyCoordinatorPassword(password, coordinator.passwordHash)) {
      if (!coordinator.isActive) {
        return NextResponse.json({ error: "Account is deactivated. Contact your administrator." }, { status: 403 });
      }
      const response = buildLoginResponse(
        { id: coordinator.id, email: coordinator.email, name: coordinator.name },
        "coordinator"
      );
      console.info(`[api/login] coordinator ${Date.now() - startedAt}ms`);
      return response;
    }

    if (instructor && await verifyInstructorPassword(password, instructor.passwordHash)) {
      if (!instructor.isActive) {
        return NextResponse.json({ error: "Account is deactivated. Contact your administrator." }, { status: 403 });
      }
      const response = buildLoginResponse(
        { id: instructor.id, email: instructor.email, name: instructor.name },
        "instructor"
      );
      console.info(`[api/login] instructor ${Date.now() - startedAt}ms`);
      return response;
    }

    console.info(`[api/login] invalid ${Date.now() - startedAt}ms`);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch {
    console.info(`[api/login] error ${Date.now() - startedAt}ms`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
