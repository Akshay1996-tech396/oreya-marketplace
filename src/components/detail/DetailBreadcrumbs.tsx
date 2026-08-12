import Link from "next/link";

type DetailBreadcrumbItem = {
  label: string;
  href?: string;
};

type DetailBreadcrumbsProps = {
  items: DetailBreadcrumbItem[];
};

export default function DetailBreadcrumbs({
  items,
}: DetailBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#2e2e2e] sm:gap-3"
    >
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;

        return (
          <span
            key={`${item.label}-${index}`}
            className="flex min-w-0 items-center gap-2 sm:gap-3"
          >
            {index > 0 ? (
              <span aria-hidden="true" className="text-[#b5b5b5]">
                |
              </span>
            ) : null}

            {item.href && !isCurrent ? (
              <Link
                href={item.href}
                className="break-words text-[#111111] hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "break-words text-[#777777]"
                    : "break-words text-[#111111]"
                }
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}