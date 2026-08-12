import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getRedirectPath(role: string) {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  return "/customer";
}

export default async function VendorLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getRedirectPath(user.role));
  }

  return (
    <>
      <Header />

      <main className="bg-white text-black">
        <section className="mx-auto max-w-[1180px] px-5 py-20 lg:px-0">
          <LoginForm
            allowedRole="VENDOR"
            title="Vendor Login"
            subtitle="Sign in to manage your restaurant, products, services, reservations, and orders."
            defaultRedirectPath="/vendor/dashboard"
            showVendorLinks
          />

          <div className="mx-auto mt-20 max-w-[860px] border-t border-gray-200 pt-12">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-black">
                  Need help?
                </h2>

                <p className="mt-5 max-w-xl text-sm leading-6 text-black">
                  Contact our support team if you need help accessing your
                  vendor account.
                </p>
              </div>

              <a
                href="/contact"
                className="text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700"
              >
                Vendor Support ↗
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}