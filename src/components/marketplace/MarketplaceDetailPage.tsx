import Link from "next/link";

type DetailRecord = Record<string, string>;

type MarketplaceDetailPageProps = {
  title: string;
  description: string;
  record?: DetailRecord;
  backLink: string;
  editLink?: string;
};

function formatLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

function getStatusClass(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes("delivered") ||
    value.includes("completed") ||
    value.includes("active") ||
    value.includes("approved") ||
    value.includes("confirmed") ||
    value.includes("paid") ||
    value.includes("available")
  ) {
    return "bg-green-50 text-green-600 dark:bg-green-500/15";
  }

  if (
    value.includes("pending") ||
    value.includes("processing") ||
    value.includes("scheduled")
  ) {
    return "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/15";
  }

  if (
    value.includes("cancel") ||
    value.includes("reject") ||
    value.includes("blocked") ||
    value.includes("failed")
  ) {
    return "bg-red-50 text-red-600 dark:bg-red-500/15";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

export default function MarketplaceDetailPage({
  title,
  description,
  record,
  backLink,
  editLink,
}: MarketplaceDetailPageProps) {
  if (!record) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Record not found
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The requested record does not exist in dummy data.
        </p>

        <Link
          href={backLink}
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={backLink}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
          >
            Back
          </Link>

          {editLink && (
            <Link
              href={editLink}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Details
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(record).map(([key, value]) => {
            const isBadge =
              key.toLowerCase().includes("status") ||
              key.toLowerCase().includes("payment");

            return (
              <div
                key={key}
                className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
              >
                <p className="text-xs font-medium uppercase text-gray-400">
                  {formatLabel(key)}
                </p>

                <div className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
                  {isBadge ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                        value
                      )}`}
                    >
                      {value}
                    </span>
                  ) : (
                    value
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}