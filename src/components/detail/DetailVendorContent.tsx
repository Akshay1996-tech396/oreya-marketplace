import Link from "next/link";

type DetailVendorContentProps = {
  name: string;
  description?: string | null;
  profileHref?: string | null;
};

export default function DetailVendorContent({
  name,
  description,
  profileHref,
}: DetailVendorContentProps) {
  return (
    <div className="min-w-0">
      <h3 className="break-words font-heading text-xl uppercase text-[#111111]">
        {name}
      </h3>

      <p className="mt-3 break-words text-sm leading-7 text-[#666666]">
        {description?.trim() ||
          "Vendor information will be available soon."}
      </p>

      {/* {profileHref ? (
        <Link
          href={profileHref}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-black bg-white px-6 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
        >
          View Vendor Profile
        </Link>
      ) : null} */}
    </div>
  );
}