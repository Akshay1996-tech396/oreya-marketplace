"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faStar,
  faScrewdriverWrench,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

type ProductImageGalleryProps = {
  title: string;
  category: string;
  images?: string[];
};

export default function ProductImageGallery({
  title,
  category,
  images = [],
}: ProductImageGalleryProps) {
  const cleanImages = images.filter(Boolean);
  const [selectedImage, setSelectedImage] = useState(cleanImages[0] || "");

  const icon =
    category === "Restaurants"
      ? faUtensils
      : category === "Services"
        ? faScrewdriverWrench
        : category === "Experiences"
          ? faStar
          : faBagShopping;

  if (cleanImages.length === 0) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="flex h-full w-full items-center justify-center">
          <FontAwesomeIcon icon={icon} className="h-16 w-16 text-gray-500" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-gray-100">
        <img
          src={selectedImage}
          alt={title}
          className="h-full w-full object-cover"
        />
      </div>

      {cleanImages.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {cleanImages.map((imageUrl) => {
            const isSelected = selectedImage === imageUrl;

            return (
              <button
                key={imageUrl}
                type="button"
                onClick={() => setSelectedImage(imageUrl)}
                className={
                  isSelected
                    ? "aspect-square overflow-hidden rounded-2xl border-2 border-black"
                    : "aspect-square overflow-hidden rounded-2xl border border-gray-200"
                }
              >
                <img
                  src={imageUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}