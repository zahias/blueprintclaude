import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assessment Blueprint Builder",
  description: "Course-aligned assessment design system for building, reviewing, and aligning exams with program standards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
