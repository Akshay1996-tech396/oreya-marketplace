import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function VendorRootPage() {
  redirect("/vendor/dashboard");
}