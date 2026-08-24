"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstructorNewBlueprintPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/instructor?tab=new");
  }, [router]);

  return <div className="text-gray-500">Opening blueprint builder...</div>;
}
