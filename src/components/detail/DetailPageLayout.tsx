import type { ReactNode } from "react";

type DetailPageLayoutProps = {
  breadcrumbs: ReactNode;
  left: ReactNode;
  right: ReactNode;
  bottom?: ReactNode;
  stickyRight?: boolean;
};

export default function DetailPageLayout({
  breadcrumbs,
  left,
  right,
  bottom,
  stickyRight = false,
}: DetailPageLayoutProps) {
  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-5 sm:px-6 lg:px-8 xl:px-0">
        {breadcrumbs}

        <section className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)] xl:gap-12">
          <div className="min-w-0">{left}</div>

          <div
            className={
              stickyRight
                ? "min-w-0 pt-1 xl:sticky xl:top-24 xl:self-start"
                : "min-w-0 pt-1"
            }
          >
            {right}
          </div>
        </section>

        {bottom}
      </div>
    </main>
  );
}