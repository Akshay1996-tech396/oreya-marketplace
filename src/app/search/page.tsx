import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { searchMarketplaceItems } from "@/lib/marketplace";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || "";

  const results = query ? await searchMarketplaceItems(query) : [];

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
        <div className="mb-8 text-sm text-gray-500">
          <Link href="/" className="hover:text-black">
            Home
          </Link>

          <span className="mx-2">/</span>

          <span className="text-black">Search</span>
        </div>

        <div className="mb-10 border-b border-gray-200 pb-8">
          <h1 className="font-heading text-4xl uppercase tracking-wide">
            Search Results
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Showing results for:{" "}
            <span className="font-medium text-black">
              {query || "No search query"}
            </span>
          </p>
        </div>

        {query && results.length > 0 && (
          <>
            <p className="mb-8 text-sm text-gray-500">
              {results.length} {results.length === 1 ? "result" : "results"}{" "}
              found
            </p>

            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((item) => (
                <ProductCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          </>
        )}

        {query && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <h2 className="font-heading text-2xl">No result found</h2>

            <p className="mt-3 text-sm text-gray-500">
              No active products, services, restaurants or experiences found for
              this search.
            </p>
          </div>
        )}

        {!query && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <h2 className="font-heading text-2xl">Search something</h2>

            <p className="mt-3 text-sm text-gray-500">
              Use the search bar to find active products, services, vendors or
              restaurants.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}