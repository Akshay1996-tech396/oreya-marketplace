import { Suspense } from "react";
import CustomerDashboardContent from "./CustomerDashboardContent";

export default function CustomerPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white text-black">
          <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
            <div className="flex min-h-[400px] items-center justify-center">
              <p className="text-sm text-gray-500">
                Loading your dashboard...
              </p>
            </div>
          </section>
        </main>
      }
    >
      <CustomerDashboardContent />
    </Suspense>
  );
}