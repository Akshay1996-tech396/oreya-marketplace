"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import CartDrawer from "@/components/cart/CartDrawer";
import type { MarketplaceItem } from "@/types/marketplace";

export type DrawerCartItem = {
  id: string;
  productId: string | null;
  serviceId: string | null;
  title: string;
  slug: string;
  vendor: string;
  image: string;
  quantity: number;
  price: number;
  currency: string;
  type: "PRODUCT" | "SERVICE";
  lineTotal: number;
};

type CartDrawerContextValue = {
  isOpen: boolean;
  items: DrawerCartItem[];
  count: number;
  subtotal: number;
  currency: string;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItemToCart: (item: MarketplaceItem) => Promise<void>;
  refreshCart: () => Promise<void>;
  updateCartItem: (cartItemId: string, quantity: number) => Promise<void>;
};

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

async function fetchCartDrawerData() {
  const response = await fetch("/api/cart/drawer", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "The cart could not be loaded.");
  }

  return data;
}

async function addProductOrServiceToCart(item: MarketplaceItem) {
  if (item.type !== "PRODUCT" && item.type !== "SERVICE") {
    return {
      response: new Response(null, { status: 400 }),
      data: {
        message: "Restaurants are available for table reservation only.",
      },
    };
  }

  const body =
    item.type === "PRODUCT"
      ? {
          productId: item.id,
          quantity: 1,
        }
      : {
          serviceId: item.id,
          quantity: 1,
        };

  const response = await fetch("/api/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return {
    response,
    data,
  };
}

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<DrawerCartItem[]>([]);
  const [count, setCount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [currency, setCurrency] = useState("AED");

  const refreshCart = useCallback(async () => {
    try {
      const data = await fetchCartDrawerData();

      setItems(data.items || []);
      setCount(Number(data.count || 0));
      setSubtotal(Number(data.subtotal || 0));
      setCurrency(data.currency || "AED");
    } catch (error) {
      console.error("CART_DRAWER_REFRESH_ERROR", error);

      setItems([]);
      setCount(0);
      setSubtotal(0);
      setCurrency("AED");
    }
  }, []);

  const openCart = useCallback(() => {
    setIsOpen(true);
    refreshCart();
  }, [refreshCart]);

  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    setIsOpen((previousValue) => !previousValue);
    refreshCart();
  }, [refreshCart]);

  const addItemToCart = useCallback(
    async (item: MarketplaceItem) => {
      if (item.type !== "PRODUCT" && item.type !== "SERVICE") {
        alert("Restaurants are available for table reservation only.");
        return;
      }

      try {
        const { response, data } = await addProductOrServiceToCart(item);

        if (response.status === 401) {
          router.push(
            `/login?redirect=${encodeURIComponent(window.location.pathname)}`
          );
          return;
        }

        if (!response.ok) {
          alert(data.message || "The item could not be added to the cart.");
          return;
        }

        window.dispatchEvent(new Event("cart-updated"));

        await refreshCart();
        setIsOpen(true);
      } catch (error) {
        console.error("ADD_ITEM_TO_CART_ERROR", error);
        alert("The item could not be added to the cart.");
      }
    },
    [router, refreshCart]
  );

  const updateCartItem = useCallback(
    async (cartItemId: string, quantity: number) => {
      try {
        const response = await fetch("/api/cart/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            cartItemId,
            quantity,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.message || "The cart could not be updated.");
          return;
        }

        window.dispatchEvent(new Event("cart-updated"));

        await refreshCart();
      } catch (error) {
        console.error("UPDATE_CART_ITEM_ERROR", error);
        alert("The cart could not be updated.");
      }
    },
    [refreshCart]
  );

  useEffect(() => {
    function handleExternalOpenCart() {
      openCart();
    }

    function handleExternalCloseCart() {
      closeCart();
    }

    function handleExternalRefreshCart() {
      refreshCart();
    }

    window.addEventListener("open-cart-drawer", handleExternalOpenCart);
    window.addEventListener("close-cart-drawer", handleExternalCloseCart);
    window.addEventListener("cart-updated", handleExternalRefreshCart);

    return () => {
      window.removeEventListener("open-cart-drawer", handleExternalOpenCart);
      window.removeEventListener("close-cart-drawer", handleExternalCloseCart);
      window.removeEventListener("cart-updated", handleExternalRefreshCart);
    };
  }, [openCart, closeCart, refreshCart]);

  const value = useMemo(
    () => ({
      isOpen,
      items,
      count,
      subtotal,
      currency,
      openCart,
      closeCart,
      toggleCart,
      addItemToCart,
      refreshCart,
      updateCartItem,
    }),
    [
      isOpen,
      items,
      count,
      subtotal,
      currency,
      openCart,
      closeCart,
      toggleCart,
      addItemToCart,
      refreshCart,
      updateCartItem,
    ]
  );

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  const router = useRouter();
  const context = useContext(CartDrawerContext);

  if (context) {
    return context;
  }

  async function fallbackRefreshCart() {
    window.dispatchEvent(new Event("cart-updated"));
  }

  function fallbackOpenCart() {
    window.dispatchEvent(new Event("open-cart-drawer"));
  }

  function fallbackCloseCart() {
    window.dispatchEvent(new Event("close-cart-drawer"));
  }

  async function fallbackAddItemToCart(item: MarketplaceItem) {
    if (item.type !== "PRODUCT" && item.type !== "SERVICE") {
      alert("Restaurants are available for table reservation only.");
      return;
    }

    try {
      const { response, data } = await addProductOrServiceToCart(item);

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }

      if (!response.ok) {
        alert(data.message || "The item could not be added to the cart.");
        return;
      }

      window.dispatchEvent(new Event("cart-updated"));
      window.dispatchEvent(new Event("open-cart-drawer"));
    } catch (error) {
      console.error("FALLBACK_ADD_ITEM_TO_CART_ERROR", error);
      alert("The item could not be added to the cart.");
    }
  }

  async function fallbackUpdateCartItem(cartItemId: string, quantity: number) {
    try {
      const response = await fetch("/api/cart/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          cartItemId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "The cart could not be updated.");
        return;
      }

      window.dispatchEvent(new Event("cart-updated"));
    } catch (error) {
      console.error("FALLBACK_UPDATE_CART_ITEM_ERROR", error);
      alert("The cart could not be updated.");
    }
  }

  return {
    isOpen: false,
    items: [],
    count: 0,
    subtotal: 0,
    currency: "AED",
    openCart: fallbackOpenCart,
    closeCart: fallbackCloseCart,
    toggleCart: fallbackOpenCart,
    addItemToCart: fallbackAddItemToCart,
    refreshCart: fallbackRefreshCart,
    updateCartItem: fallbackUpdateCartItem,
  };
}