import prisma from "@/lib/prisma";
import { getAdminFromCookies, type AdminPayload } from "@/lib/auth";
import { getCoordinatorFromCookies, type CoordinatorPayload } from "@/lib/coordinatorAuth";
import { getInstructorFromCookies, type InstructorPayload } from "@/lib/instructorAuth";

export async function getVerifiedAdmin(): Promise<AdminPayload | null> {
  const admin = await getAdminFromCookies();
  if (!admin) return null;
  const dbAdmin = await prisma.admin.findUnique({ where: { id: admin.id }, select: { id: true, email: true, name: true } });
  return dbAdmin;
}

export async function getVerifiedCoordinator(): Promise<CoordinatorPayload | null> {
  const coordinator = await getCoordinatorFromCookies();
  if (!coordinator) return null;
  const dbCoordinator = await prisma.coordinator.findUnique({
    where: { id: coordinator.id },
    select: { id: true, email: true, name: true, isActive: true },
  });
  if (!dbCoordinator?.isActive) return null;
  return { id: dbCoordinator.id, email: dbCoordinator.email, name: dbCoordinator.name };
}

export async function getVerifiedInstructor(): Promise<InstructorPayload | null> {
  const instructor = await getInstructorFromCookies();
  if (!instructor) return null;
  const dbInstructor = await prisma.instructor.findUnique({
    where: { id: instructor.id },
    select: { id: true, email: true, name: true, isActive: true },
  });
  if (!dbInstructor?.isActive) return null;
  return { id: dbInstructor.id, email: dbInstructor.email, name: dbInstructor.name };
}
