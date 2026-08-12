"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type CategoryState = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count?: {
    products: number;
    services: number;
    restaurants: number;
  };
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export default function AdminEditCategoryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const categoryId = params.id;

  const [category, setCategory] = useState<CategoryState | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    async function loadCategory() {
      try {
        setIsLoading(true);
        setMessage(null);

        const response = await fetch(`/api/admin/categories/${categoryId}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Unable to load category.");
        }

        const loadedCategory = result.category as CategoryState;

        setCategory(loadedCategory);
        setName(loadedCategory.name || "");
        setDescription(loadedCategory.description || "");
        setImage(loadedCategory.image || "");
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Unable to load category.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (categoryId) {
      void loadCategory();
    }
  }, [categoryId]);

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
      setIsSaving(true);
      setMessage(null);

      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
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
        throw new Error(result?.message || "Unable to update category.");
      }

      setMessage({
        type: "success",
        text: "Category updated successfully.",
      });

      router.push("/admin/categories");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update category.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this category? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setMessage(null);

      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to delete category.");
      }

      router.push("/admin/categories");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to delete category.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Loading category...
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
          Category not found.
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/admin/categories"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  const productCount = category._count?.products || 0;
  const serviceCount = category._count?.services || 0;
  const restaurantCount = category._count?.restaurants || 0;
  const isCategoryUsed = productCount > 0 || serviceCount > 0 || restaurantCount > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">Category</p>

          <h1 className="font-heading text-2xl text-gray-900 dark:text-white">
            Edit Category
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update category details used across marketplace listings.
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
            Current slug: <span className="font-medium">{category.slug}</span>
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

        <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-4 text-sm dark:bg-gray-900 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Products
            </p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
              {productCount}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Services
            </p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
              {serviceCount}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Restaurants
            </p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
              {restaurantCount}
            </p>
          </div>
        </div>

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

        {isCategoryUsed ? (
          <div className="mt-6 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            This category is currently used by marketplace records. You can edit
            it, but it cannot be deleted until products, services, and
            restaurants are unlinked from it.
          </div>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/categories"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving || isCategoryUsed}
              className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete Category"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            {isSaving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}