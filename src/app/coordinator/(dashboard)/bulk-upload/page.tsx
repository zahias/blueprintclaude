import { redirect } from "next/navigation";

export default function DeprecatedBulkUploadPage() {
  redirect("/coordinator/term-setup#syllabi");
}
