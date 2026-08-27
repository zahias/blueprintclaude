"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/instructor", label: "Blueprints", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/instructor/grades", label: "Grades", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { href: "/instructor/course-reports", label: "Course Reports", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [instructorName, setInstructorName] = useState("");

  useEffect(() => {
    fetch("/api/instructor/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/instructor/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.instructor) setInstructorName(data.instructor.name);
      });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/instructor/logout", { method: "POST" });
    router.push("/instructor/login");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-gray-900 text-white flex flex-col md:min-h-screen">
        <div className="p-4 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-sm">Blueprint Builder</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 md:p-4 flex gap-2 overflow-x-auto md:block md:space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/instructor" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 hidden md:block">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 truncate">{instructorName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
