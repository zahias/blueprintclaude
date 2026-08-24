import Link from "next/link";

export default function AdminUsersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage coordinator and instructor access.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/instructors" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition">
          <h2 className="font-semibold text-gray-900">Instructors</h2>
          <p className="text-sm text-gray-500 mt-1">Assign majors and manage instructor accounts.</p>
        </Link>
        <Link href="/admin/coordinators" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition">
          <h2 className="font-semibold text-gray-900">Coordinators</h2>
          <p className="text-sm text-gray-500 mt-1">Assign coordinator ownership and review access.</p>
        </Link>
      </div>
    </div>
  );
}
