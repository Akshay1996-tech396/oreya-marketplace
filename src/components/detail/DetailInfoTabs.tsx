"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type SpecificationItem = {
  label: string;
  value: string;
};

type ReviewItem = {
  id: string;
  customerName: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
};

export type DetailInfoCustomTab = {
  key: string;
  label: string;
  content: ReactNode;
};

type DetailInfoTabsProps = {
  customTabs?: DetailInfoCustomTab[];
  initialCustomTabKey?: string;
  specifications?: SpecificationItem[];
  specificationImage?: string | null;
  exchangeRefundTitle?: string;
  exchangeRefundText?: string;
  reviews?: ReviewItem[];
  aboutBrandImage?: string | null;
};

type TabKey = "specifications" | "exchange" | "reviews";

type PolicySection = {
  title: string;
  paragraphs: string[];
};

const tabs: { key: TabKey; label: string }[] = [
  {
    key: "specifications",
    label: "Specifications",
  },
  {
    key: "exchange",
    label: "Exchanges and Refunds",
  },
  {
    key: "reviews",
    label: "Customer Reviews",
  },
];

function getSafeRating(rating: number) {
  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.min(5, Math.max(0, Math.round(rating)));
}

function StarRating({ rating }: { rating: number }) {
  const safeRating = getSafeRating(rating);

  return (
    <div className="flex items-center gap-1 text-sm text-black">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{star <= safeRating ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function parseParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parsePolicySections(title: string, text: string): PolicySection[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const detectedSections = blocks
    .map((block) => {
      const lines = block
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        return null;
      }

      const firstLine = lines[0];
      const firstLineLower = firstLine.toLowerCase();

      const looksLikeHeading =
        firstLineLower.includes("policy") ||
        firstLineLower.includes("refund") ||
        firstLineLower.includes("exchange") ||
        firstLineLower.includes("return") ||
        firstLineLower.includes("cancellation") ||
        firstLineLower.includes("reschedule");

      if (!looksLikeHeading) {
        return null;
      }

      return {
        title: firstLine,
        paragraphs: [lines.slice(1).join("\n")],
      };
    })
    .filter((section): section is PolicySection => Boolean(section));

  if (detectedSections.length > 0) {
    return detectedSections;
  }

  return [
    {
      title,
      paragraphs: parseParagraphs(text),
    },
  ];
}

export default function DetailInfoTabs({
  customTabs,
  initialCustomTabKey,
  specifications = [],
  specificationImage,
  exchangeRefundTitle = "Our Returns",
  exchangeRefundText = "All purchases are eligible for exchange or refund within the allowed return period. Requests must be submitted within the validity period for review. Once approved, refunds will be processed to the original method of payment in accordance with standard processing timelines. After the return period has elapsed, purchases shall be considered final and non-refundable.",
  reviews = [],
  aboutBrandImage,
}: DetailInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(
    initialCustomTabKey || customTabs?.[0]?.key || "specifications"
  );

  const visibleTabs = useMemo(
    () =>
      customTabs?.length
        ? customTabs.map((tab) => ({ key: tab.key, label: tab.label }))
        : tabs,
    [customTabs]
  );

  useEffect(() => {
    if (visibleTabs.some((tab) => tab.key === activeTab)) {
      return;
    }

    setActiveTab(visibleTabs[0]?.key || "specifications");
  }, [activeTab, visibleTabs]);

  const activeCustomTab = customTabs?.find((tab) => tab.key === activeTab) || null;

  const policySections = useMemo(() => {
    return parsePolicySections(exchangeRefundTitle, exchangeRefundText);
  }, [exchangeRefundTitle, exchangeRefundText]);

  return (
    <section className="mt-14 sm:mt-20">
      <div className="flex items-center gap-8 overflow-x-auto border-b border-[#d8d8d8]">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 whitespace-nowrap border-b-2 pb-3 font-heading text-[16px] uppercase tracking-wide transition sm:text-[20px] ${
              activeTab === tab.key
                ? "border-black text-black"
                : "border-transparent text-[#b6b6b6]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeCustomTab ? (
        activeCustomTab.content
      ) : (
      <div className="py-10">
        {activeTab === "specifications" ? (
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="overflow-hidden rounded-3xl bg-gray-100">
              {specificationImage ? (
                <img
                  src={specificationImage}
                  alt="Specifications"
                  className="h-[360px] w-full object-cover sm:h-[430px]"
                />
              ) : (
                <div className="flex h-[360px] w-full items-center justify-center text-sm text-gray-400 sm:h-[430px]">
                  Specification image not available
                </div>
              )}
            </div>

            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide text-gray-900">
                Specifications
              </h2>

              {specifications.length === 0 ? (
                <p className="mt-5 text-sm leading-7 text-gray-500">
                  No specifications available for this item.
                </p>
              ) : (
                <div className="mt-6 space-y-5">
                  {specifications.map((item, index) => (
                    <div key={`${item.label}-${index}`}>
                      <h3 className="font-heading text-base uppercase tracking-wide text-gray-900">
                        {item.label}
                      </h3>

                      <p className="mt-2 text-sm leading-7 text-gray-600">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "exchange" ? (
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="overflow-hidden rounded-3xl bg-gray-100">
              {aboutBrandImage ? (
                <img
                  src={aboutBrandImage}
                  alt={exchangeRefundTitle}
                  className="h-[360px] w-full object-cover sm:h-[430px]"
                />
              ) : (
                <div className="flex h-[360px] w-full items-center justify-center text-sm text-gray-400 sm:h-[430px]">
                  Image not available
                </div>
              )}
            </div>

            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide text-gray-900">
                {exchangeRefundTitle}
              </h2>

              <div className="mt-6 space-y-7">
                {policySections.map((section, index) => (
                  <div key={`${section.title}-${index}`}>
                    <h3 className="font-heading text-base uppercase tracking-wide text-gray-900">
                      {section.title}
                    </h3>

                    <div className="mt-3 space-y-4 text-sm leading-7 text-gray-600">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "reviews" ? (
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-heading text-2xl uppercase tracking-wide text-gray-900">
              Customer Reviews
            </h2>

            {reviews.length === 0 ? (
              <div className="mt-6 flex flex-col items-center">
                <StarRating rating={0} />

                <p className="mt-3 text-sm text-gray-500">
                  Be the first to write a review
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 text-left md:grid-cols-2">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-3xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {review.customerName}
                        </p>

                        {review.createdAt ? (
                          <p className="mt-1 text-xs text-gray-400">
                            {review.createdAt}
                          </p>
                        ) : null}
                      </div>

                      <StarRating rating={review.rating} />
                    </div>

                    {review.comment ? (
                      <p className="mt-4 text-sm leading-7 text-gray-600">
                        {review.comment}
                      </p>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-gray-400">
                        No comment added.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
      )}
    </section>
  );
}