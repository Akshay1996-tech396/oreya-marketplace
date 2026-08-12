"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export default function AdminAddCategoryPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage({
        type: "error",
        text: "Category name is required.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);

      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          description,
          image,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to create category.");
      }

      setMessage({
        type: "success",
        text: "Category created successfully.",
      });

      router.push("/admin/categories");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to create category.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">Category</p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Add Category
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create a marketplace category for products, services, and
            restaurants.
          </p>
        </div>

        <Link
          href="/admin/categories"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          Back to Categories
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7"
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Category Details
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter the category name, description, and optional image URL.
          </p>
        </div>

        {message ? (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label
              htmlFor="categoryName"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Category Name <span className="text-error-500">*</span>
            </label>

            <input
              id="categoryName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: Restaurants"
              required
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          <div>
            <label
              htmlFor="categoryImage"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Category Image URL
            </label>

            <input
              id="categoryImage"
              type="text"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="/uploads/categories/restaurants.jpg"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          <div>
            <label
              htmlFor="categoryDescription"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description
            </label>

            <textarea
              id="categoryDescription"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Write a short description for this category."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          {image.trim() ? (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Image Preview
              </p>

              <div className="h-48 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <img
                  src={image}
                  alt="Category preview"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/categories"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            {isSubmitting ? "Creating Category..." : "Create Category"}
          </button>
        </div>
      </form>
    </div>
  );
}