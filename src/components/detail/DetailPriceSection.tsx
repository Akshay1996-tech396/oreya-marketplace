import type { ReactNode } from "react";

type DetailPriceSectionProps = {
  currency: string;
  amount: string | number;
  prefix?: string;
  children?: ReactNode;
};

function formatAmount(amount: string | number) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return String(amount);
  }

  return numericAmount.toFixed(2);
}

export default function DetailPriceSection({
  currency,
  amount,
  prefix,
  children,
}: DetailPriceSectionProps) {
  return (
    <div className="mt-3">
      <p className="text-[24px] font-semibold text-[#111111] sm:text-[28px]">
        {prefix ? `${prefix} ` : ""}
        {currency} {formatAmount(amount)}
      </p>

      {children}
    </div>
  );
}