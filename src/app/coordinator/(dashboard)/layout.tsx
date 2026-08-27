"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/coordinator/term-setup", label: "Term Setup", icon: "M8 7V3m8 4V3M5 11h14M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/coordinator/blueprints", label: "Blueprint Review", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/coordinator/grades", label: "Grade Review", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" },
  { href: "/coordinator/course-reports", label: "Course Report Review", icon: "M8 6h8M8 10h8M8 14h5m-7 8h12a2 2 0 002-2V7.414A2 2 0 0019.414 6L16 2.586A2 2 0 0014.586 2H6a2 2 0 00-2 2v16a2 2 0 002 2z" },
  { href: "/coordinator/courses", label: "Courses & Syllabi", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
];

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [coordName, setCoordName] = useState("");

  useEffect(() => {
    fetch("/api/coordinator/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/coordinator/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.coordinator) setCoordName(data.coordinator.name);
      });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/coordinator/logout", { method: "POST" });
    router.push("/coordinator/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <Link href="/coordinator/term-setup" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="font-bold text-sm">Term Setup</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href
              || pathname.startsWith(item.href)
              || (item.href === "/coordinator/courses" && pathname.startsWith("/coordinator/syllabus-import"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-teal-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 truncate">{coordName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
