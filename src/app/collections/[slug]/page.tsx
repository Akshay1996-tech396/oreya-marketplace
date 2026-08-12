import Link from "next/link";
import { notFound } from "next/navigation";
import CollectionBrowser from "@/components/marketplace/CollectionBrowser";
import { getCollectionData } from "@/lib/marketplace";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faStar,
  faScrewdriverWrench,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

type CollectionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;

  const collection = await getCollectionData(slug);

  if (!collection) {
    notFound();
  }

  const icon =
    collection.slug === "restaurants"
      ? faUtensils
      : collection.slug === "services"
        ? faScrewdriverWrench
        : collection.slug === "experiences"
          ? faStar
          : faBagShopping;

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
        <div className="mb-8 text-sm text-gray-500">
          <Link href="/" className="hover:text-black">
            Home
          </Link>

          <span className="mx-2">/</span>

          <span className="text-black">{collection.title}</span>
        </div>

        <div className="mb-10 border-b border-gray-200 pb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-600 text-2xl text-white">
            <FontAwesomeIcon icon={icon} className="h-6 w-6" />
          </div>

          <p className="mt-3 text-sm uppercase tracking-wide text-gray-500">
            {collection.title}
          </p>
        </div>

        <CollectionBrowser
          slug={collection.slug}
          title={collection.title}
          items={collection.items}
        />
      </section>
    </main>
  );
}