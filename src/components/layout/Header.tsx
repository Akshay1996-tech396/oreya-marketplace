"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import NotificationBell from "../notifications/NotificationBell";
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  UserCircle,
  UserRound,
  X,
} from "lucide-react";
import { useCartDrawer } from "@/context/CartDrawerContext";

const logoImagePath = "/images/oreya-logo.svg";

type HeaderUser = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

type AuthMeResponse = {
  authenticated?: boolean;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

function BrandLogo({
  onClick,
  mobile = false,
}: {
  onClick?: () => void;
  mobile?: boolean;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className={`flex shrink-0 items-center ${
        mobile ? "gap-2" : "gap-2 md:gap-3"
      }`}
      aria-label="OREYA home"
    >
      <img
        src={logoImagePath}
        alt="OREYA"
        className={`w-auto object-contain ${
          mobile ? "h-[52px] max-w-[160px]" : "h-[52px] max-w-[170px] md:h-12"
        }`}
      />
    </Link>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { openCart } = useCartDrawer();

  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState("all");
  const [user, setUser] = useState<HeaderUser>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const profileRef = useRef<HTMLDivElement | null>(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      setIsUserLoading(true);

      const response = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json().catch(() => null)) as
        | AuthMeResponse
        | null;

      if (!response.ok || !data?.authenticated || !data?.user) {
        setUser(null);
        return;
      }

      const currentUser = data.user;

      if (!currentUser.id || !currentUser.role) {
        setUser(null);
        return;
      }

      setUser({
        id: currentUser.id,
        name: currentUser.name || "Account",
        email: currentUser.email || "",
        role: currentUser.role,
      });
    } catch (error) {
      console.error("HEADER_CURRENT_USER_ERROR", error);
      setUser(null);
    } finally {
      setIsUserLoading(false);
    }
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      if (searchCategory === "restaurants") {
        router.push("/restaurants");
        setMobileMenuOpen(false);
      }

      return;
    }

    if (searchCategory === "restaurants") {
      router.push(`/restaurants?search=${encodeURIComponent(query)}`);
    } else if (searchCategory === "services") {
      router.push(`/search?q=${encodeURIComponent(query)}&type=services`);
    } else if (searchCategory === "products") {
      router.push(`/search?q=${encodeURIComponent(query)}&type=products`);
    } else {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }

    setMobileMenuOpen(false);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      setProfileOpen(false);
      setMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("LOGOUT_ERROR", error);
    }
  }

  const loadCartCount = useCallback(async () => {
    try {
      const response = await fetch("/api/cart/count", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      setCartCount(Number(data?.count || 0));
    } catch (error) {
      console.error("HEADER_CART_COUNT_ERROR", error);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [pathname, loadCurrentUser]);

  useEffect(() => {
    loadCartCount();

    function handleFocus() {
      loadCurrentUser();
      loadCartCount();
    }

    function handleCartUpdated() {
      loadCartCount();
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener("cart-updated", handleCartUpdated);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("cart-updated", handleCartUpdated);
    };
  }, [pathname, loadCartCount, loadCurrentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  function handleOpenCart() {
    setMobileMenuOpen(false);
    openCart();
  }

  function getProfilePath() {
    if (!user) {
      return "/login";
    }

    if (user.role === "ADMIN") {
      return "/admin/dashboard";
    }

    if (user.role === "VENDOR") {
      return "/vendor/dashboard";
    }

    return "/customer";
  }

  return (
    <>
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-20">
          <div className="flex h-[84px] items-center gap-4 md:h-[70px]">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center text-black lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={26} />
            </button>

            <BrandLogo />

            <form
              onSubmit={handleSearch}
              className="hidden h-11 flex-1 items-center rounded-full bg-gray-100 px-4 md:flex"
            >
              <select
                value={searchCategory}
                onChange={(event) => setSearchCategory(event.target.value)}
                className="bg-transparent text-sm font-medium text-black outline-none"
              >
                <option value="all">All Categories</option>
                <option value="restaurants">Restaurants</option>
                <option value="services">Services</option>
                <option value="products">Products</option>
                <option value="experiences">Experiences</option>
              </select>

              <ChevronDown size={15} className="ml-2 text-black" />

              <div className="mx-5 h-6 w-px bg-gray-300" />

              <input
                type="text"
                placeholder="What are you looking for?"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
              />

              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center text-black"
                aria-label="Search"
              >
                <Search size={22} />
              </button>
            </form>

            <div className="ml-auto flex items-center gap-3 md:gap-4">
              {user ? (
                <div className="hidden md:block">
                  <NotificationBell />
                </div>
              ) : null}

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:bg-gray-100 md:bg-gray-100"
                  aria-label="Profile menu"
                >
                  <UserCircle size={26} />
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                    {isUserLoading ? (
                      <div className="rounded-xl px-4 py-3 text-sm text-gray-500">
                        Checking account...
                      </div>
                    ) : user ? (
                      <>
                        <Link
                          href={getProfilePath()}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-100"
                        >
                          <UserRound size={17} />
                          My Profile
                        </Link>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                        >
                          <LogOut size={17} />
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-100"
                        >
                          <LogIn size={17} />
                          Sign in
                        </Link>

                        <Link
                          href="/register"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-100"
                        >
                          <UserRound size={17} />
                          Register
                        </Link>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleOpenCart}
                className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition hover:bg-gray-100 md:bg-gray-100"
                aria-label="Cart"
              >
                <ShoppingCart size={25} />

                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="mb-4 flex h-12 items-center rounded-full bg-gray-100 px-4 md:hidden"
          >
            <select
              value={searchCategory}
              onChange={(event) => setSearchCategory(event.target.value)}
              className="max-w-[72px] bg-transparent text-sm font-medium text-black outline-none"
            >
              <option value="all">All</option>
              <option value="restaurants">Restaurants</option>
              <option value="services">Services</option>
              <option value="products">Products</option>
              <option value="experiences">Experiences</option>
            </select>

            <ChevronDown size={15} className="ml-1 text-black" />

            <div className="mx-4 h-6 w-px bg-gray-300" />

            <input
              type="text"
              placeholder="What are you looking for?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
            />

            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center text-black"
              aria-label="Search"
            >
              <Search size={24} />
            </button>
          </form>

          <nav className="hidden h-12 items-center gap-8 text-sm font-semibold text-black lg:flex">
            <Link href="/restaurants">Restaurants</Link>
            <Link href="/collections/services">Services</Link>
            <Link href="/collections/products">Products</Link>
            <Link
              href="/collections/experiences"
              className="flex items-center gap-1"
            >
              Experiences <ChevronDown size={13} />
            </Link>
            <Link href="#" className="flex items-center gap-1">
              Support <ChevronDown size={13} />
            </Link>
            <Link href="/vendor/register">Become our Partner</Link>
          </nav>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[99998] bg-black/40 transition-opacity duration-300 lg:hidden ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-[99999] h-screen w-full max-w-[390px] bg-white transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[84px] items-center gap-4 px-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center text-black"
            aria-label="Close menu"
          >
            <X size={28} />
          </button>

          <BrandLogo onClick={() => setMobileMenuOpen(false)} mobile />

          <div className="ml-auto flex items-center gap-3">
            <Link
              href={user ? getProfilePath() : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center text-black"
              aria-label="Profile"
            >
              <UserCircle size={27} />
            </Link>

            <button
              type="button"
              onClick={handleOpenCart}
              className="relative flex h-10 w-10 items-center justify-center text-black"
              aria-label="Cart"
            >
              <ShoppingCart size={27} />

              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="px-4">
          <form
            onSubmit={handleSearch}
            className="flex h-12 items-center rounded-full bg-gray-100 px-4"
          >
            <select
              value={searchCategory}
              onChange={(event) => setSearchCategory(event.target.value)}
              className="max-w-[72px] bg-transparent text-sm font-medium text-black outline-none"
            >
              <option value="all">All</option>
              <option value="restaurants">Restaurants</option>
              <option value="services">Services</option>
              <option value="products">Products</option>
              <option value="experiences">Experiences</option>
            </select>

            <ChevronDown size={15} className="ml-1 text-black" />

            <div className="mx-4 h-6 w-px bg-gray-300" />

            <input
              type="text"
              placeholder="What are you looking for?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
            />

            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center text-black"
              aria-label="Search"
            >
              <Search size={24} />
            </button>
          </form>
        </div>

        <div className="mt-5 border-t border-gray-200 px-4 py-5">
          <nav className="space-y-7 font-heading text-[16px] uppercase text-black">
            <Link
              href="/restaurants"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              Restaurants
            </Link>

            <Link
              href="/collections/services"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              Services
            </Link>

            <Link
              href="/collections/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              Products
            </Link>

            <Link
              href="/collections/experiences"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between"
            >
              Experiences
              <ChevronDown size={18} className="-rotate-90" />
            </Link>

            <Link
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between"
            >
              Support
              <ChevronDown size={18} className="-rotate-90" />
            </Link>

            <Link
              href="/vendor/register"
              onClick={() => setMobileMenuOpen(false)}
              className="block"
            >
              Become our Partner
            </Link>
          </nav>
        </div>

        <div className="absolute bottom-8 left-0 w-full px-4">
          {isUserLoading ? (
            <div className="mb-5 flex items-center gap-3 text-[17px] text-gray-500">
              <UserCircle size={28} />
              Checking account...
            </div>
          ) : user ? (
            <>
              <Link
                href={getProfilePath()}
                onClick={() => setMobileMenuOpen(false)}
                className="mb-5 flex items-center gap-3 text-[17px] text-black"
              >
                <UserCircle size={28} />
                My Profile
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="mb-5 flex items-center gap-3 text-[17px] text-red-600"
              >
                <LogOut size={25} />
                Logout
              </button>

              <Link
                href="#"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-[16px] text-black"
              >
                Delete My Account
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-5 flex items-center gap-3 text-[17px] text-black"
            >
              <UserCircle size={28} />
              Sign in / Register
            </Link>
          )}

          <div className="mt-7 flex items-center gap-4">
            <Link
              href="#"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-xl font-bold text-black"
            >
              f
            </Link>

            <Link
              href="#"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-xl text-black"
            >
              𝕏
            </Link>

            <Link
              href="#"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-xl text-black"
            >
              ◎
            </Link>

            <Link
              href="#"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-lg text-black"
            >
              ▶
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}