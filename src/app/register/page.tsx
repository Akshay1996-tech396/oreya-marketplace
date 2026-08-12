import { redirect } from "next/navigation";
import RegisterForm from "../../components/auth/RegisterForm";
import { getCurrentUser } from "../../lib/auth";

export const dynamic = "force-dynamic";

function getRedirectPath(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/customer";
}

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getRedirectPath(user.role));
  }

  return (
    <main className="bg-white text-black">
      <section className="mx-auto max-w-[1180px] px-5 py-20 lg:px-0">
        <RegisterForm />

        <div className="mx-auto mt-20 max-w-[860px] border-t border-gray-200 pt-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-black">
                Got questions?
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-6 text-black">
                You can find frequently asked questions and answers on our
                customer service page.
              </p>
            </div>

            <a
              href="/contact"
              className="text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700"
            >
              Customer Service ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}