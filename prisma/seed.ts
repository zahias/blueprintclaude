import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEMO_COURSE_TITLES = [
  "Foundations and Professional Practice",
  "Methods, Evidence, and Analysis",
  "Applied Systems and Case Integration",
];

const MAJOR_PREFIX_RULES: { pattern: RegExp; prefix: string }[] = [
  { pattern: /public health/i, prefix: "PBHL" },
];

const MAJOR_SEEDS: { name: string; description: string }[] = [
  { name: "Bachelor of Science in Public Health", description: "Public health program covering epidemiology, health policy, and community health." },
];

const LO_TEMPLATES = [
  "Explain core concepts and terminology in {course}.",
  "Apply standard methods and tools used in {course}.",
  "Analyze realistic cases and identify appropriate solution strategies.",
  "Evaluate alternatives using evidence, constraints, and stakeholder needs.",
  "Design a complete solution that satisfies stated requirements.",
  "Communicate findings and decisions using discipline-appropriate language.",
];

const TOPIC_TEMPLATES = [
  "Foundations and vocabulary",
  "Models, frameworks, and assumptions",
  "Methods and problem-solving techniques",
  "Tools, notation, and documentation",
  "Case analysis and interpretation",
  "Design and decision tradeoffs",
  "Evaluation, testing, and quality",
  "Integration and professional communication",
];

const ASSESSMENTS = [
  { name: "Quiz 1", weightPercent: 10, maxPoints: 20 },
  { name: "Assignment Portfolio", weightPercent: 15, maxPoints: 50 },
  { name: "Midterm Exam", weightPercent: 30, maxPoints: 100 },
  { name: "Applied Project", weightPercent: 15, maxPoints: 60 },
  { name: "Final Exam", weightPercent: 30, maxPoints: 100 },
];

function safeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function prefixForMajor(name: string, index: number) {
  return MAJOR_PREFIX_RULES.find((rule) => rule.pattern.test(name))?.prefix || `MAJ${index + 1}`;
}

function seedKey(course: { code: string; majorName: string }) {
  return `${safeId(course.majorName)}-${safeId(course.code)}`;
}

function demoCourseCode(prefix: string, index: number) {
  return `${prefix}${210 + index * 10}`;
}

function isGeneratedDemoCourse(course: { name: string; description: string | null }) {
  return DEMO_COURSE_TITLES.includes(course.name)
    || Boolean(course.description?.includes(" seeded for ") && course.description.includes(" analytics coverage."));
}

function termKey(term: { semester: string; academicYear: string }) {
  return `${term.semester.toLowerCase()}-${term.academicYear.replace(/[^0-9]+/g, "-")}`;
}

function scoreFor(courseIndex: number, studentIndex: number, assessmentIndex: number, maxPoints: number) {
  const profile = courseIndex % 6;
  const rank = studentIndex / 23;
  let percent: number;

  if (profile === 0) {
    percent = 0.91 + ((studentIndex + assessmentIndex) % 5) / 100;
  } else if (profile === 1) {
    percent = 0.48 + rank * 0.38 + ((assessmentIndex % 2) * 0.03);
  } else if (profile === 2) {
    percent = 0.76 + ((studentIndex * 3 + assessmentIndex) % 5) / 100;
  } else if (profile === 3) {
    percent = [0.34, 0.42, 0.55, 0.66, 0.74, 0.82, 0.91, 0.98][studentIndex % 8];
  } else if (profile === 4) {
    percent = studentIndex < 5 ? 0.45 + studentIndex * 0.03 : 0.78 + ((studentIndex + assessmentIndex) % 10) / 100;
  } else {
    percent = 0.58 + rank * 0.35 + (((studentIndex * 7 + assessmentIndex * 5) % 9) - 4) / 100;
  }

  const score = Math.max(0, Math.min(maxPoints, Math.round(maxPoints * percent * 10) / 10));
  return score;
}

function gradebookStatusFor(courseIndex: number, majorCourseIndex: number) {
  if (majorCourseIndex === 0) return "APPROVED";
  const statuses = ["APPROVED", "SUBMITTED", "DRAFT", "NEEDS_REVISION", "APPROVED", "SUBMITTED"] as const;
  return statuses[courseIndex % statuses.length];
}

function courseReportStatusFor(courseIndex: number, majorCourseIndex: number) {
  if (majorCourseIndex === 0) return "SUBMITTED";
  const statuses = ["APPROVED", "NEEDS_REVISION", "DRAFT", "SUBMITTED", "APPROVED"] as const;
  return statuses[courseIndex % statuses.length];
}

function blueprintStatusesFor(courseIndex: number) {
  const patterns = [
    ["APPROVED", "APPROVED", "SUBMITTED", "DRAFT"],
    ["APPROVED", "NEEDS_REVISION", "DRAFT", "DRAFT"],
    ["APPROVED", "APPROVED", "APPROVED", "SUBMITTED"],
    ["SUBMITTED", "NEEDS_REVISION", "DRAFT", "DRAFT"],
  ] as const;
  return patterns[courseIndex % patterns.length];
}

function bloomFor(courseIndex: number, blueprintIndex: number, topicIndex: number) {
  const profile = courseIndex % 4;
  if (profile === 0) {
    return { bloomRemember: 1, bloomUnderstand: 1, bloomApply: 1, bloomAnalyze: 1, bloomEvaluate: topicIndex % 2, bloomCreate: blueprintIndex % 2 };
  }
  if (profile === 1) {
    return { bloomRemember: 2, bloomUnderstand: 2, bloomApply: 1, bloomAnalyze: 0, bloomEvaluate: 0, bloomCreate: 0 };
  }
  if (profile === 2) {
    return { bloomRemember: 0, bloomUnderstand: 1, bloomApply: 1, bloomAnalyze: 1, bloomEvaluate: 1, bloomCreate: 1 };
  }
  return { bloomRemember: 1, bloomUnderstand: 0, bloomApply: 1, bloomAnalyze: 2, bloomEvaluate: 1, bloomCreate: 0 };
}

function questionFormatsFor(courseIndex: number, blueprintIndex: number, blueprintId: string) {
  const profiles = [
    [
      { formatType: "MULTIPLE_CHOICE", group: "CLOSED_ENDED", label: "Multiple Choice", questionCount: 8, gradeWeight: 30 },
      { formatType: "SHORT_ANSWER", group: "OPEN_ENDED", label: "Short Answer", questionCount: 8, gradeWeight: 40 },
      { formatType: "CASE_SCENARIO", group: "OPEN_ENDED", label: "Case/Scenario", questionCount: 4, gradeWeight: 30 },
    ],
    [
      { formatType: "MULTIPLE_CHOICE", group: "CLOSED_ENDED", label: "Multiple Choice", questionCount: 16, gradeWeight: 75 },
      { formatType: "TRUE_FALSE", group: "CLOSED_ENDED", label: "True/False", questionCount: 4, gradeWeight: 25 },
    ],
    [
      { formatType: "MATCHING", group: "CLOSED_ENDED", label: "Matching", questionCount: 4, gradeWeight: 15 },
      { formatType: "SHORT_ANSWER", group: "OPEN_ENDED", label: "Short Answer", questionCount: 8, gradeWeight: 35 },
      { formatType: "PROBLEM_SOLVING", group: "OPEN_ENDED", label: "Problem Solving", questionCount: 8, gradeWeight: 50 },
    ],
    [
      { formatType: "FILL_IN_BLANK", group: "CLOSED_ENDED", label: "Fill in the Blank", questionCount: 10, gradeWeight: 20 },
      { formatType: "CASE_SCENARIO", group: "OPEN_ENDED", label: "Case/Scenario", questionCount: 5, gradeWeight: 60 },
      { formatType: "ESSAY", group: "OPEN_ENDED", label: "Essay", questionCount: 5, gradeWeight: 20 },
    ],
  ] as const;
  return profiles[(courseIndex + blueprintIndex) % profiles.length].map((format, index) => ({
    id: `${blueprintId}-format-${index + 1}`,
    blueprintId,
    ...format,
  }));
}

async function main() {
  console.log("Seeding database...");

  const [passwordHash, coordHash, instructorHash] = await Promise.all([
    bcrypt.hash("admin123", 12),
    bcrypt.hash("coord123", 12),
    bcrypt.hash("instructor123", 12),
  ]);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@blueprint.edu" },
    update: { passwordHash, name: "System Admin" },
    create: { email: "admin@blueprint.edu", passwordHash, name: "System Admin" },
  });

  const coordinator = await prisma.coordinator.upsert({
    where: { email: "coordinator@blueprint.edu" },
    update: { passwordHash: coordHash, name: "QA Coordinator", isActive: true },
    create: { email: "coordinator@blueprint.edu", passwordHash: coordHash, name: "QA Coordinator" },
  });

  const instructor = await prisma.instructor.upsert({
    where: { email: "instructor@blueprint.edu" },
    update: { passwordHash: instructorHash, name: "Demo Instructor", isActive: true },
    create: { email: "instructor@blueprint.edu", passwordHash: instructorHash, name: "Demo Instructor" },
  });

  await prisma.academicTerm.updateMany({ where: { isActive: true }, data: { isActive: false } });
  const activeTerm = await prisma.academicTerm.upsert({
    where: { semester_academicYear: { semester: "FALL", academicYear: "2026/2027" } },
    update: { isActive: true, activatedAt: new Date(), activatedById: coordinator.id },
    create: { semester: "FALL", academicYear: "2026/2027", isActive: true, activatedAt: new Date(), activatedById: coordinator.id },
  });
  const historicalTerms = await Promise.all([
    prisma.academicTerm.upsert({
      where: { semester_academicYear: { semester: "SPRING", academicYear: "2025/2026" } },
      update: { isActive: false },
      create: { semester: "SPRING", academicYear: "2025/2026", isActive: false },
    }),
    prisma.academicTerm.upsert({
      where: { semester_academicYear: { semester: "FALL", academicYear: "2025/2026" } },
      update: { isActive: false },
      create: { semester: "FALL", academicYear: "2025/2026", isActive: false },
    }),
  ]);

  await Promise.all(MAJOR_SEEDS.map((seed) => prisma.major.upsert({
    where: { name: seed.name },
    update: { description: seed.description },
    create: { name: seed.name, description: seed.description },
  })));

  const currentMajors = await prisma.major.findMany({
    orderBy: { name: "asc" },
    include: { courses: { orderBy: { code: "asc" } } },
  });

  const courses: { id: string; code: string; name: string; majorId: string; majorName: string; majorCourseIndex: number }[] = [];

  for (const [majorIndex, major] of currentMajors.entries()) {
    const prefix = prefixForMajor(major.name, majorIndex);

    await prisma.coordinatorMajor.upsert({
      where: { coordinatorId_majorId: { coordinatorId: coordinator.id, majorId: major.id } },
      update: {},
      create: { coordinatorId: coordinator.id, majorId: major.id },
    });
    await prisma.instructorMajor.upsert({
      where: { instructorId_majorId: { instructorId: instructor.id, majorId: major.id } },
      update: {},
      create: { instructorId: instructor.id, majorId: major.id },
    });

    const desiredDemoCodes = DEMO_COURSE_TITLES.map((_, index) => demoCourseCode(prefix, index));
    const onlyGeneratedDemoCourses = major.courses.length > 0 && major.courses.every(isGeneratedDemoCourse);
    if (onlyGeneratedDemoCourses) {
      await prisma.course.deleteMany({
        where: {
          majorId: major.id,
          name: { in: DEMO_COURSE_TITLES },
          code: { notIn: desiredDemoCodes },
        },
      });
    }

    const sourceCourses = major.courses.length === 0 || onlyGeneratedDemoCourses
      ? await Promise.all(DEMO_COURSE_TITLES.map((title, index) => prisma.course.upsert({
          where: { majorId_code: { majorId: major.id, code: demoCourseCode(prefix, index) } },
          update: {
            name: title,
            description: `${title} seeded for ${major.name} analytics coverage.`,
          },
          create: {
            majorId: major.id,
            code: demoCourseCode(prefix, index),
            name: title,
            description: `${title} seeded for ${major.name} analytics coverage.`,
          },
        })))
      : major.courses;

    for (const [majorCourseIndex, courseSeed] of sourceCourses.entries()) {
      const course = await prisma.course.upsert({
        where: { majorId_code: { majorId: major.id, code: courseSeed.code } },
        update: {
          name: courseSeed.name,
          description: `${courseSeed.name} with realistic seeded outcomes, topics, blueprints, rosters, assessments, and grades.`,
        },
        create: {
          majorId: major.id,
          code: courseSeed.code,
          name: courseSeed.name,
          description: `${courseSeed.name} with realistic seeded outcomes, topics, blueprints, rosters, assessments, and grades.`,
        },
      });
      courses.push({ id: course.id, code: course.code, name: course.name, majorId: major.id, majorName: major.name, majorCourseIndex });
    }
  }

  for (const course of courses) {
    await prisma.gradeAssessment.deleteMany({ where: { courseId: course.id } });
    await prisma.courseEnrollment.deleteMany({ where: { courseId: course.id } });
    await prisma.blueprint.deleteMany({ where: { courseId: course.id } });
    await prisma.topic.deleteMany({ where: { courseId: course.id } });
    await prisma.learningOutcome.deleteMany({ where: { courseId: course.id } });
    await prisma.courseSyllabus.deleteMany({ where: { courseId: course.id } });
    await prisma.courseOffering.deleteMany({ where: { courseId: course.id } });
  }

  for (const [courseIndex, course] of courses.entries()) {
    const key = seedKey(course);
    const offering = await prisma.courseOffering.upsert({
      where: { courseId_termId: { courseId: course.id, termId: activeTerm.id } },
      update: {},
      create: { courseId: course.id, termId: activeTerm.id },
    });
    await prisma.courseOfferingInstructor.upsert({
      where: { courseOfferingId_instructorId: { courseOfferingId: offering.id, instructorId: instructor.id } },
      update: {},
      create: { courseOfferingId: offering.id, instructorId: instructor.id },
    });
    const syllabus = await prisma.courseSyllabus.create({
      data: {
        courseId: course.id,
        courseOfferingId: offering.id,
        semester: activeTerm.semester,
        academicYear: activeTerm.academicYear,
        sourceFileName: `${course.code}-FALL-2026-2027.docx`,
        importedById: coordinator.id,
        isCurrent: true,
      },
    });
    const blueprintStatuses = blueprintStatusesFor(courseIndex);
    const los = LO_TEMPLATES.map((description, i) => ({
      id: `seed-${key}-lo-${i + 1}`,
      courseId: course.id,
      syllabusId: syllabus.id,
      code: `CLO${i + 1}`,
      description: description.replace("{course}", course.name),
    }));
    const topics = TOPIC_TEMPLATES.map((name, i) => ({
      id: `seed-${key}-topic-${i + 1}`,
      courseId: course.id,
      syllabusId: syllabus.id,
      name,
      description: `${name} for ${course.name}`,
      sortOrder: i,
    }));
    const topicLos = topics.flatMap((topic, i) => [i % los.length, (i + 1) % los.length].map((loIndex) => ({
      topicId: topic.id,
      learningOutcomeId: los[loIndex].id,
    })));
    const studentRows = Array.from({ length: 24 }, (_, i) => ({
      universityStudentId: `${key.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
      email: `${key}-student-${String(i + 1).padStart(2, "0")}@blueprint.edu`,
      firstName: `Student${String(i + 1).padStart(2, "0")}`,
      lastName: course.code,
      displayName: `Student${String(i + 1).padStart(2, "0")} ${course.code}`,
    }));
    const blueprintRows = blueprintStatuses.map((status, i) => ({
      id: `seed-${key}-blueprint-${i + 1}`,
      courseId: course.id,
      courseOfferingId: offering.id,
      instructorId: instructor.id,
      instructorName: instructor.name,
      title: `${course.code} ${["Quiz Blueprint", "Midterm Blueprint", "Project Blueprint", "Final Blueprint"][i]}`,
      semester: activeTerm.semester,
      academicYear: activeTerm.academicYear,
      duration: [45, 90, 120, 150][i],
      totalMarks: 20,
      status,
    }));
    const blueprintTopicRows = blueprintRows.flatMap((blueprint, i) => (
      Array.from({ length: 4 }, (_, topicIndex) => ({
        id: `seed-${key}-bp-${i + 1}-topic-${topicIndex + 1}`,
        blueprintId: blueprint.id,
        topicId: topics[(i + topicIndex) % topics.length].id,
        questionCount: 5,
        totalPoints: 5,
        ...bloomFor(courseIndex, i, topicIndex),
      }))
    ));
    const reviewCommentRows = blueprintRows
      .filter((blueprint) => blueprint.status !== "DRAFT")
      .map((blueprint, i) => ({
        id: `${blueprint.id}-review`,
        blueprintId: blueprint.id,
        coordinatorId: coordinator.id,
        content: blueprint.status === "NEEDS_REVISION"
          ? "Please strengthen CLO coverage for the final design topic before approval."
          : `Blueprint review note ${i + 1} from the seeded coordinator workflow.`,
      }));
    const blueprintQuestionFormatRows = blueprintRows.flatMap((blueprint, i) => questionFormatsFor(courseIndex, i, blueprint.id));

    await prisma.learningOutcome.createMany({ data: los });
    await prisma.topic.createMany({ data: topics });
    await prisma.topicLO.createMany({ data: topicLos });
    await prisma.student.createMany({ data: studentRows, skipDuplicates: true });
    const students = await prisma.student.findMany({
      where: { email: { in: studentRows.map((student) => student.email) } },
      orderBy: { email: "asc" },
    });
    await prisma.courseEnrollment.createMany({
      data: students.map((student, i) => ({
        courseId: course.id,
        courseOfferingId: offering.id,
        studentId: student.id,
        group: `Section ${(i % 3) + 1}`,
      })),
    });
    await prisma.blueprint.createMany({ data: blueprintRows });
    await prisma.blueprintTopic.createMany({ data: blueprintTopicRows });
    await prisma.blueprintQuestionFormat.createMany({ data: blueprintQuestionFormatRows });
    await prisma.reviewComment.createMany({ data: reviewCommentRows });

    const gradebookStatus = gradebookStatusFor(courseIndex, course.majorCourseIndex);
    const submittedAt = gradebookStatus === "DRAFT" ? null : new Date();
    const reviewedAt = gradebookStatus === "APPROVED" || gradebookStatus === "NEEDS_REVISION" ? new Date() : null;
    for (let i = 0; i < ASSESSMENTS.length; i++) {
      const status = gradebookStatus;
      await prisma.gradeAssessment.create({
        data: {
          id: `seed-${key}-assessment-${i + 1}`,
          courseId: course.id,
          courseOfferingId: offering.id,
          instructorId: instructor.id,
          blueprintId: null,
          name: ASSESSMENTS[i].name,
          weightPercent: ASSESSMENTS[i].weightPercent,
          maxPoints: ASSESSMENTS[i].maxPoints,
          status,
          submittedAt,
          reviewedAt,
          reviewedById: reviewedAt ? coordinator.id : null,
          entries: {
            createMany: {
              data: students.map((student, studentIndex) => ({
                studentId: student.id,
                rawPoints: scoreFor(courseIndex, studentIndex, i, ASSESSMENTS[i].maxPoints),
              })),
            },
          },
        },
      });
    }
    await prisma.gradebook.upsert({
      where: { courseOfferingId: offering.id },
      update: {
        status: gradebookStatus,
        submittedAt,
        reviewedAt,
        reviewedById: reviewedAt ? coordinator.id : null,
      },
      create: {
        courseOfferingId: offering.id,
        status: gradebookStatus,
        submittedAt,
        reviewedAt,
        reviewedById: reviewedAt ? coordinator.id : null,
      },
    });

    const reportStatus = courseReportStatusFor(courseIndex, course.majorCourseIndex);
    const reportSubmittedAt = reportStatus === "DRAFT" ? null : new Date();
    const reportReviewedAt = reportStatus === "APPROVED" || reportStatus === "NEEDS_REVISION" ? new Date() : null;
    await prisma.courseReport.create({
      data: {
        id: `seed-${key}-course-report`,
        courseOfferingId: offering.id,
        instructorId: instructor.id,
        status: reportStatus,
        responses: {
          learningOutcomeEvidence: `The learning outcomes of ${course.code} were addressed through structured lectures, applied activities, and assessment tasks aligned to the approved blueprint. Students moved from core terminology to applied case analysis across the semester.`,
          studentCenteredness: "Student-centered learning was promoted through discussion, guided questioning, short applied tasks, and opportunities for students to justify answers rather than only recall information.",
          teachingMethods: courseIndex % 3 === 0
            ? "The course used inquiry-based learning and project-based tasks. Inquiry prompts supported reasoning during lectures, while the project required students to synthesize course concepts into an applied output."
            : "The course used case-based learning, team discussion, and brief formative checks. These methods were selected to connect concepts to practice and reveal misunderstandings early.",
          realLifeWorkplaceCommunity: "Course examples were linked to realistic workplace and community contexts, including discipline-specific cases, professional communication scenarios, and practical decision-making constraints.",
          technologyIntegration: "The LMS was used for materials, announcements, and assessment submission. Digital resources, videos, and online activities supported independent review of complex content.",
          differentiatedTeaching: "Teaching was differentiated through visual explanations, discussion, applied examples, feedback on drafts or tasks, and additional clarification for students who needed reinforcement.",
          genericSkillsDevelopment: "The course developed critical thinking, problem solving, communication, organization, and time management through case analysis, presentations, scheduled tasks, and reflective discussion.",
        },
        submittedAt: reportSubmittedAt,
        reviewedAt: reportReviewedAt,
        reviewedById: reportReviewedAt ? coordinator.id : null,
        comments: reportStatus === "NEEDS_REVISION"
          ? {
              create: {
                coordinatorId: coordinator.id,
                content: "Please add clearer evidence for the lowest-score analysis and explain the improvement action for next offering.",
              },
            }
          : undefined,
      },
    });

    if (gradebookStatus === "NEEDS_REVISION" || gradebookStatus === "SUBMITTED") {
      const gradebook = await prisma.gradebook.findUniqueOrThrow({ where: { courseOfferingId: offering.id } });
      await prisma.gradebookComment.create({
        data: {
          id: `seed-${key}-gradebook-comment`,
          gradebookId: gradebook.id,
          coordinatorId: coordinator.id,
          content: gradebookStatus === "NEEDS_REVISION"
            ? "Please review the lower tail of scores and confirm moderation notes before resubmission."
            : "Submitted gradebook is awaiting coordinator approval.",
        },
      });
    }

    for (const [historyIndex, historicalTerm] of historicalTerms.entries()) {
      const historyKey = `${key}-${termKey(historicalTerm)}`;
      const historicalOffering = await prisma.courseOffering.upsert({
        where: { courseId_termId: { courseId: course.id, termId: historicalTerm.id } },
        update: {},
        create: { courseId: course.id, termId: historicalTerm.id },
      });
      await prisma.courseOfferingInstructor.upsert({
        where: { courseOfferingId_instructorId: { courseOfferingId: historicalOffering.id, instructorId: instructor.id } },
        update: {},
        create: { courseOfferingId: historicalOffering.id, instructorId: instructor.id },
      });
      const historicalSyllabus = await prisma.courseSyllabus.create({
        data: {
          courseId: course.id,
          courseOfferingId: historicalOffering.id,
          semester: historicalTerm.semester,
          academicYear: historicalTerm.academicYear,
          sourceFileName: `${course.code}-${historicalTerm.semester}-${historicalTerm.academicYear.replace("/", "-")}.docx`,
          importedById: coordinator.id,
          isCurrent: false,
        },
      });
      const historicalLos = LO_TEMPLATES.map((description, i) => ({
        id: `seed-${historyKey}-lo-${i + 1}`,
        courseId: course.id,
        syllabusId: historicalSyllabus.id,
        code: `CLO${i + 1}`,
        description: description.replace("{course}", course.name),
      }));
      const historicalTopics = TOPIC_TEMPLATES.map((name, i) => ({
        id: `seed-${historyKey}-topic-${i + 1}`,
        courseId: course.id,
        syllabusId: historicalSyllabus.id,
        name,
        description: null,
        sortOrder: i,
      }));
      await prisma.learningOutcome.createMany({ data: historicalLos });
      await prisma.topic.createMany({ data: historicalTopics });
      await prisma.topicLO.createMany({
        data: historicalTopics.flatMap((topic, i) => [i % historicalLos.length, (i + 1) % historicalLos.length].map((loIndex) => ({
          topicId: topic.id,
          learningOutcomeId: historicalLos[loIndex].id,
        }))),
      });

      const historicalBlueprints = [0, 1].map((i) => ({
        id: `seed-${historyKey}-blueprint-${i + 1}`,
        courseId: course.id,
        courseOfferingId: historicalOffering.id,
        instructorId: instructor.id,
        instructorName: instructor.name,
        title: `${course.code} ${historicalTerm.semester} ${i === 0 ? "Midterm" : "Final"}`,
        semester: historicalTerm.semester,
        academicYear: historicalTerm.academicYear,
        duration: null,
        totalMarks: 20,
        status: "APPROVED" as const,
      }));
      await prisma.blueprint.createMany({ data: historicalBlueprints });
      await prisma.blueprintTopic.createMany({
        data: historicalBlueprints.flatMap((blueprint, i) => (
          Array.from({ length: 4 }, (_, topicIndex) => ({
            id: `seed-${historyKey}-bp-${i + 1}-topic-${topicIndex + 1}`,
            blueprintId: blueprint.id,
            topicId: historicalTopics[(topicIndex + i + historyIndex) % historicalTopics.length].id,
            questionCount: 5,
            totalPoints: 5,
            ...bloomFor(courseIndex + historyIndex, i, topicIndex),
          }))
        )),
      });
      await prisma.blueprintQuestionFormat.createMany({
        data: historicalBlueprints.flatMap((blueprint, i) => questionFormatsFor(courseIndex + historyIndex, i, blueprint.id)),
      });
    }

    console.log(`Seeded ${course.code}: active analytics plus ${historicalTerms.length} historical trend term(s)`);
  }

  console.log(`\nSeed complete for ${courses.length} courses.`);
  console.log(`Demo accounts: ${admin.email}, ${coordinator.email}, ${instructor.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
