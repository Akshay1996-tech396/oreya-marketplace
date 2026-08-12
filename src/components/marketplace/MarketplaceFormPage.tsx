import Link from "next/link";

type FieldOption = {
  label: string;
  value: string;
};

type FormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "date" | "time" | "textarea" | "select";
  placeholder?: string;
  options?: FieldOption[];
};

type MarketplaceFormPageProps = {
  title: string;
  description: string;
  backLink: string;
  fields: FormField[];
  submitText?: string;
};

export default function MarketplaceFormPage({
  title,
  description,
  backLink,
  fields,
  submitText = "Save",
}: MarketplaceFormPageProps) {
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

        <Link
          href={backLink}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
        >
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <form className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.name}
              className={field.type === "textarea" ? "md:col-span-2" : ""}
            >
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  placeholder={field.placeholder}
                  rows={5}
                  className="h-auto w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:text-white/90"
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:text-white/90"
                >
                  <option value="">Select {field.label}</option>

                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={field.name}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:text-white/90"
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 md:col-span-2">
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {submitText}
            </button>

            <Link
              href={backLink}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}