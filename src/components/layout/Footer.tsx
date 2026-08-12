import Link from "next/link";

const footerColumns = [
  {
    title: "Company",
    links: ["About Marketplace", "Blogs", "Customer Care", "FAQs"],
  },
  {
    title: "Shop",
    links: ["Restaurants", "Services", "Products", "Experiences"],
  },
  {
    title: "Legal",
    links: [
      "Terms of Service",
      "Privacy Policy",
      "Community Guidelines",
      "Payment Policy",
      "Refund Policy",
    ],
  },
  {
    title: "Partners",
    links: [
      "Become a Partner",
      "Vendor Terms",
      "Partner Policy",
      "Payout Policy",
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white text-black">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.5fr_3fr] lg:px-20">
        <div>
          <Link href="/" className="inline-flex items-center">
            <img
              src="/images/oreya-logo.svg"
              alt="Oreya"
              className="h-12 w-auto"
            />
          </Link>

          <p className="mt-5 max-w-md text-sm leading-7 text-gray-500">
            Redefining modern marketplace experiences by creating a trusted
            space for shopping, services, restaurants, experiences and
            appointment booking.
          </p>

          <div className="mt-6">
            <h3 className="font-heading text-lg uppercase">
              Download Our App
            </h3>

            <div className="mt-3 flex gap-3">
              <button className="rounded-lg bg-black px-4 py-2 text-xs text-white">
                Get it on Google Play
              </button>

              <button className="rounded-lg bg-black px-4 py-2 text-xs text-white">
                Download on App Store
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-xs">
            {["AMEX", "Apple Pay", "Visa", "Mastercard", "PayPal"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded border border-gray-200 px-2 py-1 text-gray-500"
                >
                  {item}
                </span>
              )
            )}
          </div>

          <p className="mt-8 text-xs text-gray-500">© 2026 OREYA.</p>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-heading text-base uppercase">
                {column.title}
              </h3>

              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-gray-500 hover:text-black"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        Powered by Marketplace Platform
      </div>
    </footer>
  );
}