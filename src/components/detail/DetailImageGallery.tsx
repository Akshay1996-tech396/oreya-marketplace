"use client";

import { useEffect, useMemo, useState } from "react";

type DetailImageGalleryProps = {
  title: string;
  images: string[];
  activeImage?: string;
  onActiveImageChange?: (image: string) => void;
  fallbackImage?: string;
  maxThumbnails?: number;
};

const defaultFallbackImage = "/placeholder-product.jpg";

export default function DetailImageGallery({
  title,
  images,
  activeImage,
  onActiveImageChange,
  fallbackImage = defaultFallbackImage,
  maxThumbnails,
}: DetailImageGalleryProps) {
  const safeImages = useMemo(() => {
    const filteredImages = Array.from(new Set(images.filter(Boolean)));

    return filteredImages.length > 0 ? filteredImages : [fallbackImage];
  }, [images, fallbackImage]);

  const [internalActiveImage, setInternalActiveImage] = useState(safeImages[0]);

  const selectedImage = activeImage || internalActiveImage || safeImages[0];

  useEffect(() => {
    if (activeImage) {
      return;
    }

    if (!safeImages.includes(internalActiveImage)) {
      setInternalActiveImage(safeImages[0]);
    }
  }, [activeImage, internalActiveImage, safeImages]);

  const visibleImages =
    typeof maxThumbnails === "number" && maxThumbnails > 0
      ? safeImages.slice(0, maxThumbnails)
      : safeImages;

  function selectImage(image: string) {
    if (onActiveImageChange) {
      onActiveImageChange(image);
      return;
    }

    setInternalActiveImage(image);
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="order-2 flex w-full shrink-0 gap-3 overflow-x-auto pb-1 sm:order-1 sm:w-[78px] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:pb-0">
          {visibleImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => selectImage(image)}
              className={`h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[10px] border bg-[#f5f5f5] transition sm:h-[74px] sm:w-[74px] ${
                selectedImage === image
                  ? "border-[#111111]"
                  : "border-transparent hover:border-[#b5b5b5]"
              }`}
              aria-label={`Show ${title} image ${index + 1}`}
            >
              <img
                src={image}
                alt={`${title} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = fallbackImage;
                }}
              />
            </button>
          ))}
        </div>

        <div className="order-1 h-[280px] min-w-0 flex-1 overflow-hidden rounded-[20px] bg-[#f4f1ec] sm:order-2 sm:h-[420px]">
          <img
            src={selectedImage}
            alt={title}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = fallbackImage;
            }}
          />
        </div>
      </div>
    </div>
  );
}