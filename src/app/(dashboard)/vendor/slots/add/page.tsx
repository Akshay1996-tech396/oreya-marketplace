import { redirect } from "next/navigation";

export default function VendorSlotAddRedirectPage() {
  redirect("/vendor/slots/new");
}