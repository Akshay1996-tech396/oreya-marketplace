import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getRatingClass(rating: number) {
  if (rating >= 4) {
    return "bg-green-50 text-green-700";
  }

  if (rating === 3) {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-red-50 text-red-700";
}

function getDashboardPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function VendorReviewsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "VENDOR") {
    redirect(getDashboardPath(user.role));
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      businessName: true,
      status: true,
    },
  });

  if (!vendor) {
    redirect("/vendor/dashboard");
  }

  const reviews = await prisma.review.findMany({
    where: {
      OR: [
        {
          vendorId: vendor.id,
        },
        {
          product: {
            is: {
              vendorId: vendor.id,
            },
          },
        },
        {
          service: {
            is: {
              vendorId: vendor.id,
            },
          },
        },
      ],
    },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          title: true,
          slug: true,
        },
      },
      service: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Vendor Reviews
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage real reviews received by {vendor.businessName}.
          </p>
        </div>

        <div className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
          Avg Rating: {averageRating.toFixed(1)} / 5
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg text-gray-900 dark:text-white">
            Real Vendor Reviews
          </h2>

          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            Total: {reviews.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Review
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Target
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Rating
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Comment
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Date
                </th>

                <th className="px-4 py-3 text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No vendor reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const targetType = review.product
                    ? "Product"
                    : review.service
                    ? "Service"
                    : "Vendor";

                  const targetTitle =
                    review.product?.title ||
                    review.service?.title ||
                    vendor.businessName;

                  return (
                    <tr
                      key={review.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {review.id.slice(0, 12)}...
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Review ID
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {review.customer.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {review.customer.email}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="text-sm text-gray-800 dark:text-white/90">
                          {targetTitle}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {targetType}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getRatingClass(
                            review.rating
                          )}`}
                        >
                          {review.rating} / 5
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-300">
                        {review.comment || "No comment"}
                      </td>

                      <td className="px-4 py-4 align-top text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <Link
                          href={`/vendor/reviews/${review.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}