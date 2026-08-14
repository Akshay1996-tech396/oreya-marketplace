import { Suspense } from "react";
import CustomerDashboardContent from "./CustomerDashboardContent";

export default function CustomerPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white text-black">
          <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600"></div>
                <p className="mt-4 text-sm text-gray-500">Loading your dashboard...</p>
              </div>
            </div>
          </section>
        </main>
      }
    >
      <CustomerDashboardContent />
    </Suspense>
  );
}