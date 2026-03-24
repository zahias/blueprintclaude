import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// GET: download Excel template with dummy data
export async function GET() {
  const wb = XLSX.utils.book_new();

  // Courses sheet
  const coursesData = [
    { MajorName: "Computer Science", CourseCode: "CS201", CourseName: "Data Structures and Algorithms", Description: "Fundamental data structures and algorithm design" },
    { MajorName: "Computer Science", CourseCode: "CS301", CourseName: "Database Systems", Description: "Relational databases, SQL, and normalization" },
    { MajorName: "Business Administration", CourseCode: "BA101", CourseName: "Principles of Management", Description: "Fundamentals of organizational management" },
  ];
  const coursesWs = XLSX.utils.json_to_sheet(coursesData);
  coursesWs["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 35 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, coursesWs, "Courses");

  // LearningOutcomes sheet
  const losData = [
    { MajorName: "Computer Science", CourseCode: "CS201", LOCode: "LO1", Description: "Explain fundamental data structures (arrays, linked lists, stacks, queues)" },
    { MajorName: "Computer Science", CourseCode: "CS201", LOCode: "LO2", Description: "Implement tree and graph data structures" },
    { MajorName: "Computer Science", CourseCode: "CS201", LOCode: "LO3", Description: "Analyze algorithm time and space complexity using Big-O notation" },
    { MajorName: "Computer Science", CourseCode: "CS301", LOCode: "LO1", Description: "Design normalized relational database schemas" },
    { MajorName: "Business Administration", CourseCode: "BA101", LOCode: "LO1", Description: "Explain the four functions of management" },
  ];
  const losWs = XLSX.utils.json_to_sheet(losData);
  losWs["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 8 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, losWs, "LearningOutcomes");

  // Topics sheet
  const topicsData = [
    { MajorName: "Computer Science", CourseCode: "CS201", TopicName: "Arrays and Linked Lists", Description: "Linear data structures", LinkedLOs: "LO1" },
    { MajorName: "Computer Science", CourseCode: "CS201", TopicName: "Stacks and Queues", Description: "LIFO and FIFO structures", LinkedLOs: "LO1" },
    { MajorName: "Computer Science", CourseCode: "CS201", TopicName: "Trees and Graphs", Description: "Non-linear data structures", LinkedLOs: "LO2,LO3" },
    { MajorName: "Computer Science", CourseCode: "CS301", TopicName: "ER Modeling", Description: "Entity-relationship diagrams", LinkedLOs: "LO1" },
    { MajorName: "Business Administration", CourseCode: "BA101", TopicName: "Planning and Organizing", Description: "Management functions", LinkedLOs: "LO1" },
  ];
  const topicsWs = XLSX.utils.json_to_sheet(topicsData);
  topicsWs["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, topicsWs, "Topics");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=blueprint_import_template.xlsx",
    },
  });
}
