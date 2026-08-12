import Link from "next/link";

type TableColumn = {
  key: string;
  label: string;
};

type TableRow = Record<string, string>;

type DashboardTablePageProps = {
  title: string;
  description: string;
  columns: TableColumn[];
  rows: TableRow[];
  buttonText?: string;
  buttonLink?: string;
  basePath?: string;
};

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

export default function DashboardTablePage({
  title,
  description,
  columns,
  rows,
  buttonText = "Add New",
  buttonLink,
  basePath,
}: DashboardTablePageProps) {
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

        {buttonLink ? (
          <Link
            href={buttonLink}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {buttonText}
          </Link>
        ) : (
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {buttonText}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {title} List
          </h2>

          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 font-medium text-gray-500"
                  >
                    {column.label}
                  </th>
                ))}

                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const rowId = row.id || String(index + 1);

                return (
                  <tr
                    key={rowId}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    {columns.map((column) => {
                      const value = row[column.key] ?? "";
                      const keyName = column.key.toLowerCase();

                      const isBadge =
                        keyName.includes("status") ||
                        keyName.includes("payment");

                      return (
                        <td
                          key={column.key}
                          className="whitespace-nowrap px-4 py-4 text-gray-600 dark:text-gray-300"
                        >
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
                        </td>
                      );
                    })}

                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex gap-2">
                        {basePath ? (
                          <>
                            <Link
                              href={`${basePath}/${rowId}`}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                            >
                              View
                            </Link>

                            <Link
                              href={`${basePath}/${rowId}/edit`}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                            >
                              Edit
                            </Link>
                          </>
                        ) : (
                          <>
                            <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300">
                              View
                            </button>

                            <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300">
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}