import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@blueprint.edu" },
    update: {},
    create: {
      email: "admin@blueprint.edu",
      passwordHash,
      name: "System Admin",
    },
  });
  console.log(`✅ Admin created: ${admin.email} (password: admin123)`);

  // Create sample major
  const csMajor = await prisma.major.upsert({
    where: { name: "Computer Science" },
    update: {},
    create: {
      name: "Computer Science",
      description: "Bachelor of Science in Computer Science",
    },
  });

  const bizMajor = await prisma.major.upsert({
    where: { name: "Business Administration" },
    update: {},
    create: {
      name: "Business Administration",
      description: "Bachelor of Business Administration",
    },
  });

  console.log(`✅ Majors created: ${csMajor.name}, ${bizMajor.name}`);

  // Create sample course under CS
  const course = await prisma.course.upsert({
    where: { majorId_code: { majorId: csMajor.id, code: "CS201" } },
    update: {},
    create: {
      majorId: csMajor.id,
      code: "CS201",
      name: "Data Structures and Algorithms",
      description: "Fundamental data structures and algorithm design",
    },
  });
  console.log(`✅ Course created: ${course.code} - ${course.name}`);

  // Create LOs for the course
  const loData = [
    { code: "LO1", description: "Explain fundamental data structures (arrays, linked lists, stacks, queues)" },
    { code: "LO2", description: "Implement tree and graph data structures" },
    { code: "LO3", description: "Analyze algorithm time and space complexity using Big-O notation" },
    { code: "LO4", description: "Apply sorting and searching algorithms to solve problems" },
    { code: "LO5", description: "Design efficient algorithms for real-world computational problems" },
  ];

  const los = [];
  for (const lo of loData) {
    const created = await prisma.learningOutcome.upsert({
      where: { id: `seed-${course.id}-${lo.code}` },
      update: {},
      create: {
        id: `seed-${course.id}-${lo.code}`,
        courseId: course.id,
        code: lo.code,
        description: lo.description,
      },
    });
    los.push(created);
  }
  console.log(`✅ ${los.length} Learning Outcomes created`);

  // Create topics
  const topicData = [
    { name: "Arrays and Linked Lists", loIndices: [0] },
    { name: "Stacks and Queues", loIndices: [0] },
    { name: "Trees and Graphs", loIndices: [1] },
    { name: "Algorithm Analysis", loIndices: [2] },
    { name: "Sorting Algorithms", loIndices: [3] },
    { name: "Searching Algorithms", loIndices: [3] },
    { name: "Algorithm Design Techniques", loIndices: [4] },
  ];

  for (let i = 0; i < topicData.length; i++) {
    const td = topicData[i];
    const topic = await prisma.topic.upsert({
      where: { id: `seed-${course.id}-topic-${i}` },
      update: {},
      create: {
        id: `seed-${course.id}-topic-${i}`,
        courseId: course.id,
        name: td.name,
        sortOrder: i,
      },
    });

    // Link topic to LOs
    for (const loIdx of td.loIndices) {
      await prisma.topicLO.upsert({
        where: {
          topicId_learningOutcomeId: {
            topicId: topic.id,
            learningOutcomeId: los[loIdx].id,
          },
        },
        update: {},
        create: {
          topicId: topic.id,
          learningOutcomeId: los[loIdx].id,
        },
      });
    }
  }
  console.log(`✅ ${topicData.length} Topics created and linked to LOs`);

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
