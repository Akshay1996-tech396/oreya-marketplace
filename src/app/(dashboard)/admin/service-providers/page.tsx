import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function getStatusClass(status: string) {
  if (status === "ACTIVE") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400";
  }

  return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

type ServiceProviderListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  _count: {
    services: number;
  };
};

export default async function AdminServiceProvidersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const serviceProviders: ServiceProviderListItem[] =
    await prisma.serviceProvider.findMany({
      include: {
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: [
        {
          name: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">
            Admin Panel
          </p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Service Providers
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Manage the service-provider master list used by
            administrators and vendors when creating or editing
            marketplace services.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white">
            Total Providers: {serviceProviders.length}
          </div>

          <Link
            href="/admin/service-providers/add"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Add Service Provider
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7">
        <div className="mb-5">
          <h2 className="font-heading text-xl text-gray-900 dark:text-white">
            Service Provider List
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Providers such as Urban Company, VLCC and Yes Madam
            will be available in the service forms after they are
            added here.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Service Provider
                </th>

                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Slug
                </th>

                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Services
                </th>

                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>

                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Website
                </th>

                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </th>

                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {serviceProviders.length > 0 ? (
                serviceProviders.map((provider) => (
                  <tr
                    key={provider.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
                          {provider.logo ? (
                            <img
                              src={provider.logo}
                              alt={provider.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                              {provider.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {provider.name}
                          </p>

                          {provider.description ? (
                            <p className="mt-1 line-clamp-1 max-w-[320px] text-xs text-gray-500 dark:text-gray-400">
                              {provider.description}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              No description added.
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {provider.slug}
                    </td>

                    <td className="px-4 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {provider._count.services}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
                          String(provider.status)
                        )}`}
                      >
                        {String(provider.status).replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {provider.website ? (
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-brand-500 hover:underline"
                        >
                          Visit Website
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          Not added
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(provider.createdAt)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/service-providers/${provider.id}/edit`}
                        className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No service providers found. Click
                    &ldquo;Add Service Provider&rdquo; to create
                    the first provider.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}