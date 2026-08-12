import Link from "next/link";
import type { MarketplaceItem } from "@/types/marketplace";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faStar,
  faScrewdriverWrench,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

type ProductCardProps = {
  item: MarketplaceItem;
};

export default function ProductCard({ item }: ProductCardProps) {
  const firstImage = item.images?.[0];

  const icon =
    item.category === "Restaurants"
      ? faUtensils
      : item.category === "Services"
        ? faScrewdriverWrench
        : item.category === "Experiences"
          ? faStar
          : faBagShopping;

  return (
    <Link href={`/products/${item.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-[22px] bg-gradient-to-br from-gray-100 to-gray-200">
        {firstImage ? (
          <img
            src={firstImage}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center transition duration-500 group-hover:scale-105">
            <FontAwesomeIcon icon={icon} className="h-10 w-10 text-gray-500" />
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] uppercase tracking-wide text-gray-500">
        {item.vendor}
      </p>

      <p className="text-[11px] uppercase tracking-wide text-gray-400">
        {item.category}
      </p>

      <h3 className="mt-1 text-[15px] font-semibold text-black">
        {item.title}
      </h3>

      <p className="mt-1 text-[14px] text-black">
        {item.currency} {item.price.toFixed(2)}
      </p>
    </Link>
  );
}