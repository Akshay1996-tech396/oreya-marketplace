import DashboardTablePage from "@/components/marketplace/DashboardTablePage";

type ReportStat = {
  title: string;
  value: string;
  change?: string;
};

type Column = {
  key: string;
  label: string;
};

type Row = {
  id: string;
  [key: string]: string;
};

type MarketplaceReportPageProps = {
  title: string;
  description: string;
  stats: ReportStat[];
  columns: Column[];
  rows: Row[];
  buttonText?: string;
  basePath?: string;
};

export default function MarketplaceReportPage({
  title,
  description,
  stats,
  columns,
  rows,
  buttonText = "Export Report",
  basePath,
}: MarketplaceReportPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.title}
            </p>

            <div className="mt-3 flex items-end justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {item.value}
              </h2>

              {item.change && (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600 dark:bg-green-500/15">
                  {item.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <DashboardTablePage
        title={title}
        description={description}
        columns={columns}
        rows={rows}
        buttonText={buttonText}
        basePath={basePath}
      />
    </div>
  );
}