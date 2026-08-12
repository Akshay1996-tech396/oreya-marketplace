import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

function getDashboardPath(role: string) {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "VENDOR") {
    return "/vendor";
  }

  return "/customer";
}

function getDashboardLabel(role: string) {
  if (role === "ADMIN") {
    return "Admin Dashboard";
  }

  if (role === "VENDOR") {
    return "Vendor Dashboard";
  }

  return "My Account";
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        role: null,
        dashboardPath: null,
        dashboardLabel: null,
        isAdmin: false,
        isVendor: false,
        isCustomer: false,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      role: user.role,
      dashboardPath: getDashboardPath(user.role),
      dashboardLabel: getDashboardLabel(user.role),
      isAdmin: user.role === "ADMIN",
      isVendor: user.role === "VENDOR",
      isCustomer: user.role === "CUSTOMER",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}