import Link from "next/link";

export default function AdminAcademicStructurePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Academic Structure</h1>
        <p className="text-sm text-gray-500 mt-1">Manage academic majors. Courses, CLOs, and topics are maintained by coordinators through term setup and syllabus import.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/majors" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition">
          <h2 className="font-semibold text-gray-900">Majors</h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage academic majors.</p>
        </Link>
      </div>
    </div>
  );
}
