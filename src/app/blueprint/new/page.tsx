import { redirect } from "next/navigation";

export default function LegacyNewBlueprintPage() {
  redirect("/instructor?tab=new");
}
