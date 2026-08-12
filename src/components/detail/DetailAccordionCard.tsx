"use client";

import type { ReactNode } from "react";

type DetailAccordionCardProps = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function AccordionNumber({
  number,
  isOpen,
}: {
  number: string;
  isOpen: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xs font-bold tracking-[0.14em] transition-all duration-300 ${
        isOpen
          ? "border-black bg-black text-white shadow-sm"
          : "border-[#ded8cf] bg-[#f8f6f2] text-[#6f675d]"
      }`}
    >
      {number}
    </span>
  );
}

function AccordionChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
        isOpen
          ? "border-black bg-black text-white shadow-sm"
          : "border-[#ded8cf] bg-white text-[#222222]"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className={`h-4 w-4 transition-transform duration-300 ${
          isOpen ? "rotate-180" : ""
        }`}
      >
        <path
          d="M5 7.5 10 12.5 15 7.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function DetailAccordionCard({
  id,
  number,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: DetailAccordionCardProps) {
  const buttonId = `${id}-button`;

  return (
    <div
      className={`w-full min-w-0 overflow-hidden rounded-[20px] border bg-white transition-all duration-300 ${
        isOpen
          ? "border-[#111111] shadow-[0_18px_45px_rgba(17,17,17,0.10)]"
          : "border-[#e5e0d8] shadow-[0_6px_20px_rgba(17,17,17,0.04)] hover:border-[#c9c1b6]"
      }`}
    >
      <button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={id}
        className={`flex w-full min-w-0 items-center justify-between gap-4 px-5 py-5 text-left transition-colors duration-300 sm:px-6 ${
          isOpen ? "bg-[#f8f6f2]" : "bg-white hover:bg-[#fbfaf8]"
        }`}
      >
        <span className="flex min-w-0 items-center gap-4">
          <AccordionNumber number={number} isOpen={isOpen} />

          <span className="min-w-0">
            <span className="block break-words font-heading text-lg uppercase tracking-[0.03em] text-[#111111]">
              {title}
            </span>

            {/* <span className="mt-1 block break-words text-sm leading-6 text-[#777777]">
              {subtitle}
            </span> */}
          </span>
        </span>

        <AccordionChevron isOpen={isOpen} />
      </button>

      <div
        id={id}
        role="region"
        aria-labelledby={buttonId}
        className={`grid min-w-0 transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-w-0 overflow-hidden">
          <div className="min-w-0 border-t border-[#e8e2d9] bg-[#fcfbf9] px-5 py-6 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}