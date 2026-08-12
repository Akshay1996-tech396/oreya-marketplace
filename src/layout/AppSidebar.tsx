"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faChartLine,
  faChevronDown,
  faCreditCard,
  faEllipsis,
  faGaugeHigh,
  faGear,
  faLayerGroup,
  faStore,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

import { useSidebar } from "../context/SidebarContext";

type NavLeafItem = {
  name: string;
  path: string;
  pro?: boolean;
};

type NavSubItem = {
  name: string;
  path?: string;
  pro?: boolean;
  subItems?: NavLeafItem[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
};

type MenuSection = "main" | "tools";

type OpenTopMenu = {
  section: MenuSection;
  index: number;
};

type OpenNestedMenu = {
  section: MenuSection;
  parentIndex: number;
  index: number;
};

const adminPanelItems: NavItem[] = [
  {
    icon: <FontAwesomeIcon icon={faGaugeHigh} className="h-5 w-5" fixedWidth />,
    name: "Dashboard",
    path: "/admin/dashboard",
  },
  {
    icon: <FontAwesomeIcon icon={faUsers} className="h-5 w-5" fixedWidth />,
    name: "Users",
    subItems: [
      {
        name: "Vendors",
        path: "/admin/vendors",
      },
      {
        name: "Customers",
        path: "/admin/customers",
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faStore} className="h-5 w-5" fixedWidth />,
    name: "Marketplace",
    subItems: [
      {
        name: "Products",
        subItems: [
          {
            name: "My Products",
            path: "/admin/products",
          },
          {
            name: "Orders",
            path: "/admin/orders",
          },
        ],
      },
      {
        name: "Services",
        subItems: [
          {
            name: "My Services",
            path: "/admin/services",
          },
          {
            name: "Service Providers",
            path: "/admin/service-providers",
          },
          {
            name: "Orders",
            path: "/admin/appointments",
          },
          {
            name: "Slots",
            path: "/admin/slots",
          },
        ],
      },
      {
        name: "Restaurants",
        subItems: [
          {
            name: "My Restaurants",
            path: "/admin/restaurants",
          },
          {
            name: "Orders",
            path: "/admin/restaurant-reservations",
          },
        ],
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faLayerGroup} className="h-5 w-5" fixedWidth />,
    name: "Catalog Tools",
    subItems: [
      {
        name: "Categories",
        path: "/admin/categories",
      },
      {
        name: "Category Requests",
        path: "/admin/category-requests",
      },
      {
        name: "Coupons",
        path: "/admin/coupons",
      },
      {
        name: "Reviews",
        path: "/admin/reviews",
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faCreditCard} className="h-5 w-5" fixedWidth />,
    name: "Payments",
    path: "/admin/payments",
  },
  {
    icon: <FontAwesomeIcon icon={faBell} className="h-5 w-5" fixedWidth />,
    name: "Notifications",
    path: "/admin/notifications",
  },
];

const adminToolItems: NavItem[] = [
  {
    icon: <FontAwesomeIcon icon={faChartLine} className="h-5 w-5" fixedWidth />,
    name: "Admin Reports",
    subItems: [
      {
        name: "Sales Report",
        path: "/reports/sales",
      },
      {
        name: "Orders Report",
        path: "/reports/orders",
      },
      {
        name: "Vendor Report",
        path: "/reports/vendors",
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faGear} className="h-5 w-5" fixedWidth />,
    name: "Admin Settings",
    subItems: [
      {
        name: "General and Delivery Settings",
        path: "/settings/general",
      },
      {
        name: "Payment Settings",
        path: "/settings/payment",
      },
      {
        name: "Notification Settings",
        path: "/settings/notifications",
      },
      {
        name: "Languages",
        path: "/settings/languages",
      },
      {
        name: "Currencies",
        path: "/settings/currencies",
      },
    ],
  },
];

const vendorPanelItems: NavItem[] = [
  {
    icon: <FontAwesomeIcon icon={faGaugeHigh} className="h-5 w-5" fixedWidth />,
    name: "Dashboard",
    path: "/vendor/dashboard",
  },
  {
    icon: <FontAwesomeIcon icon={faStore} className="h-5 w-5" fixedWidth />,
    name: "Marketplace",
    subItems: [
      {
        name: "Products",
        subItems: [
          {
            name: "My Products",
            path: "/vendor/products",
          },
          {
            name: "Orders",
            path: "/vendor/orders",
          },
        ],
      },
      {
        name: "Services",
        subItems: [
          {
            name: "My Services",
            path: "/vendor/services",
          },
          {
            name: "Orders",
            path: "/vendor/appointments",
          },
          {
            name: "Slots",
            path: "/vendor/slots",
          },
        ],
      },
      {
        name: "Restaurants",
        subItems: [
          {
            name: "My Restaurants",
            path: "/vendor/restaurants",
          },
          {
            name: "Orders",
            path: "/vendor/restaurant-reservations",
          },
        ],
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faLayerGroup} className="h-5 w-5" fixedWidth />,
    name: "Catalog Tools",
    subItems: [
      {
        name: "Categories",
        path: "/vendor/categories",
      },
      {
        name: "Request Category",
        path: "/vendor/categories/add",
      },
      {
        name: "Coupons",
        path: "/vendor/coupons",
      },
      {
        name: "Reviews",
        path: "/vendor/reviews",
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faCreditCard} className="h-5 w-5" fixedWidth />,
    name: "Earnings",
    path: "/vendor/earnings",
  },
  {
    icon: <FontAwesomeIcon icon={faBell} className="h-5 w-5" fixedWidth />,
    name: "Notifications",
    path: "/vendor/notifications",
  },
];

const vendorToolItems: NavItem[] = [
  {
    icon: <FontAwesomeIcon icon={faChartLine} className="h-5 w-5" fixedWidth />,
    name: "Vendor Reports",
    subItems: [
      {
        name: "Sales Report",
        path: "/vendor/reports/sales",
      },
      {
        name: "Orders Report",
        path: "/vendor/reports/orders",
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faGear} className="h-5 w-5" fixedWidth />,
    name: "Vendor Settings",
    subItems: [
      {
        name: "Delivery Settings",
        path: "/settings/vendor",
      },
    ],
  },
  {
    icon: <FontAwesomeIcon icon={faUser} className="h-5 w-5" fixedWidth />,
    name: "Profile",
    path: "/vendor/profile",
  },
];

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
  } = useSidebar();

  const pathname = usePathname();

  const isVendorArea =
    pathname.startsWith("/vendor") ||
    pathname === "/settings/vendor" ||
    pathname.startsWith("/settings/vendor/");

  const mainItems = isVendorArea
    ? vendorPanelItems
    : adminPanelItems;

  const toolItems = isVendorArea
    ? vendorToolItems
    : adminToolItems;

  const mainHeading = isVendorArea
    ? "Vendor Panel"
    : "Admin Panel";

  const toolsHeading = isVendorArea
    ? "Vendor Tools"
    : "Admin Tools";

  const logoLink = isVendorArea
    ? "/vendor/dashboard"
    : "/admin/dashboard";

  const [openTopMenu, setOpenTopMenu] =
    useState<OpenTopMenu | null>(null);

  const [openNestedMenu, setOpenNestedMenu] =
    useState<OpenNestedMenu | null>(null);

  const isActive = useCallback(
    (path: string) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
    [pathname]
  );

  const isSubItemActive = useCallback(
    (subItem: NavSubItem) => {
      if (
        subItem.path &&
        isActive(subItem.path)
      ) {
        return true;
      }

      return (
        subItem.subItems?.some((item) =>
          isActive(item.path)
        ) ?? false
      );
    },
    [isActive]
  );

  const isNavItemActive = useCallback(
    (navItem: NavItem) => {
      if (
        navItem.path &&
        isActive(navItem.path)
      ) {
        return true;
      }

      return (
        navItem.subItems?.some(
          isSubItemActive
        ) ?? false
      );
    },
    [isActive, isSubItemActive]
  );

  const isTopMenuOpen = (
    section: MenuSection,
    index: number
  ) =>
    openTopMenu?.section === section &&
    openTopMenu.index === index;

  const isNestedMenuOpen = (
    section: MenuSection,
    parentIndex: number,
    index: number
  ) =>
    openNestedMenu?.section === section &&
    openNestedMenu.parentIndex ===
      parentIndex &&
    openNestedMenu.index === index;

  const handleTopMenuToggle = (
    index: number,
    section: MenuSection
  ) => {
    setOpenTopMenu((currentMenu) => {
      const isCurrentMenu =
        currentMenu?.section === section &&
        currentMenu.index === index;

      if (isCurrentMenu) {
        setOpenNestedMenu(null);
        return null;
      }

      setOpenNestedMenu(null);

      return {
        section,
        index,
      };
    });
  };

  const handleNestedMenuToggle = (
    parentIndex: number,
    index: number,
    section: MenuSection
  ) => {
    setOpenNestedMenu((currentMenu) => {
      const isCurrentMenu =
        currentMenu?.section === section &&
        currentMenu.parentIndex ===
          parentIndex &&
        currentMenu.index === index;

      if (isCurrentMenu) {
        return null;
      }

      return {
        section,
        parentIndex,
        index,
      };
    });
  };

  useEffect(() => {
    let matchedTopMenu: OpenTopMenu | null =
      null;

    let matchedNestedMenu:
      | OpenNestedMenu
      | null = null;

    const menuGroups: Array<{
      section: MenuSection;
      items: NavItem[];
    }> = [
      {
        section: "main",
        items: mainItems,
      },
      {
        section: "tools",
        items: toolItems,
      },
    ];

    for (const menuGroup of menuGroups) {
      for (
        let parentIndex = 0;
        parentIndex <
        menuGroup.items.length;
        parentIndex += 1
      ) {
        const navItem =
          menuGroup.items[parentIndex];

        if (
          navItem.path &&
          isActive(navItem.path)
        ) {
          matchedTopMenu = null;
          matchedNestedMenu = null;
          break;
        }

        if (!navItem.subItems) {
          continue;
        }

        for (
          let subIndex = 0;
          subIndex <
          navItem.subItems.length;
          subIndex += 1
        ) {
          const subItem =
            navItem.subItems[subIndex];

          if (
            subItem.path &&
            isActive(subItem.path)
          ) {
            matchedTopMenu = {
              section: menuGroup.section,
              index: parentIndex,
            };

            break;
          }

          if (
            subItem.subItems?.some(
              (item) =>
                isActive(item.path)
            )
          ) {
            matchedTopMenu = {
              section: menuGroup.section,
              index: parentIndex,
            };

            matchedNestedMenu = {
              section: menuGroup.section,
              parentIndex,
              index: subIndex,
            };

            break;
          }
        }

        if (matchedTopMenu) {
          break;
        }
      }

      if (matchedTopMenu) {
        break;
      }
    }

    setOpenTopMenu(matchedTopMenu);
    setOpenNestedMenu(
      matchedNestedMenu
    );
  }, [
    pathname,
    isActive,
    mainItems,
    toolItems,
  ]);

  const renderBadge = (
    item: {
      pro?: boolean;
    },
    active: boolean
  ) => {
    if (!item.pro) {
      return null;
    }

    return (
      <span className="ml-auto flex items-center">
        <span
          className={`menu-dropdown-badge ${
            active
              ? "menu-dropdown-badge-active"
              : "menu-dropdown-badge-inactive"
          }`}
        >
          pro
        </span>
      </span>
    );
  };

  const renderMenuItems = (
    items: NavItem[],
    section: MenuSection
  ) => (
    <ul className="flex flex-col gap-4">
      {items.map((navItem, parentIndex) => {
        const topMenuOpen = isTopMenuOpen(
          section,
          parentIndex
        );

        const navItemActive =
          isNavItemActive(navItem);

        const topMenuId = `${section}-menu-${parentIndex}`;

        return (
          <li key={navItem.name}>
            {navItem.subItems ? (
              <button
                type="button"
                onClick={() =>
                  handleTopMenuToggle(
                    parentIndex,
                    section
                  )
                }
                aria-expanded={topMenuOpen}
                aria-controls={topMenuId}
                className={`menu-item group w-full cursor-pointer ${
                  navItemActive ||
                  topMenuOpen
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } ${
                  !isExpanded &&
                  !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={
                    navItemActive ||
                    topMenuOpen
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }
                >
                  {navItem.icon}
                </span>

                {(
                  isExpanded ||
                  isHovered ||
                  isMobileOpen
                ) && (
                  <span className="menu-item-text text-left">
                    {navItem.name}
                  </span>
                )}

                {(
                  isExpanded ||
                  isHovered ||
                  isMobileOpen
                ) && (
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    fixedWidth
                    className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                      topMenuOpen
                        ? "rotate-180 text-brand-500"
                        : ""
                    }`}
                  />
                )}
              </button>
            ) : navItem.path ? (
              <Link
                href={navItem.path}
                className={`menu-item group ${
                  navItemActive
                    ? "menu-item-active"
                    : "menu-item-inactive"
                }`}
              >
                <span
                  className={
                    navItemActive
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }
                >
                  {navItem.icon}
                </span>

                {(
                  isExpanded ||
                  isHovered ||
                  isMobileOpen
                ) && (
                  <span className="menu-item-text text-left">
                    {navItem.name}
                  </span>
                )}
              </Link>
            ) : null}

            {navItem.subItems &&
            (
              isExpanded ||
              isHovered ||
              isMobileOpen
            ) ? (
              <div
                id={topMenuId}
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  topMenuOpen
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="ml-9 mt-2 space-y-1">
                    {navItem.subItems.map(
                      (
                        subItem,
                        subIndex
                      ) => {
                        const subItemActive =
                          isSubItemActive(
                            subItem
                          );

                        const nestedMenuOpen =
                          isNestedMenuOpen(
                            section,
                            parentIndex,
                            subIndex
                          );

                        const nestedMenuId = `${topMenuId}-submenu-${subIndex}`;

                        if (
                          subItem.subItems
                        ) {
                          return (
                            <li
                              key={
                                subItem.name
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleNestedMenuToggle(
                                    parentIndex,
                                    subIndex,
                                    section
                                  )
                                }
                                aria-expanded={
                                  nestedMenuOpen
                                }
                                aria-controls={
                                  nestedMenuId
                                }
                                className={`menu-dropdown-item flex w-full items-center text-left ${
                                  subItemActive ||
                                  nestedMenuOpen
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                <span>
                                  {
                                    subItem.name
                                  }
                                </span>

                                <FontAwesomeIcon
                                  icon={faChevronDown}
                                  fixedWidth
                                  className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                                    nestedMenuOpen
                                      ? "rotate-180 text-brand-500"
                                      : ""
                                  }`}
                                />
                              </button>

                              <div
                                id={
                                  nestedMenuId
                                }
                                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                                  nestedMenuOpen
                                    ? "grid-rows-[1fr]"
                                    : "grid-rows-[0fr]"
                                }`}
                              >
                                <div className="overflow-hidden">
                                  <ul className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-800">
                                    {subItem.subItems.map(
                                      (
                                        leafItem
                                      ) => {
                                        const leafItemActive =
                                          isActive(
                                            leafItem.path
                                          );

                                        return (
                                          <li
                                            key={
                                              leafItem.path
                                            }
                                          >
                                            <Link
                                              href={
                                                leafItem.path
                                              }
                                              className={`menu-dropdown-item ${
                                                leafItemActive
                                                  ? "menu-dropdown-item-active"
                                                  : "menu-dropdown-item-inactive"
                                              }`}
                                            >
                                              <span>
                                                {
                                                  leafItem.name
                                                }
                                              </span>

                                              {renderBadge(
                                                leafItem,
                                                leafItemActive
                                              )}
                                            </Link>
                                          </li>
                                        );
                                      }
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </li>
                          );
                        }

                        if (!subItem.path) {
                          return null;
                        }

                        return (
                          <li
                            key={
                              subItem.path
                            }
                          >
                            <Link
                              href={
                                subItem.path
                              }
                              className={`menu-dropdown-item ${
                                subItemActive
                                  ? "menu-dropdown-item-active"
                                  : "menu-dropdown-item-inactive"
                              }`}
                            >
                              <span>
                                {
                                  subItem.name
                                }
                              </span>

                              {renderBadge(
                                subItem,
                                subItemActive
                              )}
                            </Link>
                          </li>
                        );
                      }
                    )}
                  </ul>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0 ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
      } ${
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full"
      } lg:translate-x-0`}
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() =>
        setIsHovered(false)
      }
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered
            ? "lg:justify-center"
            : "justify-start"
        }`}
      >
        <Link href={logoLink}>
          {isExpanded ||
          isHovered ||
          isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/oreya-logo.svg"
                alt="Oreya"
                width={150}
                height={40}
              />

              <Image
                className="hidden dark:block"
                src="/images/oreya-logo.svg"
                alt="Oreya"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/oreya-logo.svg"
              alt="Oreya"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                  !isExpanded &&
                  !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded ||
                isHovered ||
                isMobileOpen ? (
                  mainHeading
                ) : (
                  <FontAwesomeIcon icon={faEllipsis} className="h-5 w-5" fixedWidth />
                )}
              </h2>

              {renderMenuItems(
                mainItems,
                "main"
              )}
            </div>

            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                  !isExpanded &&
                  !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded ||
                isHovered ||
                isMobileOpen ? (
                  toolsHeading
                ) : (
                  <FontAwesomeIcon icon={faEllipsis} className="h-5 w-5" fixedWidth />
                )}
              </h2>

              {renderMenuItems(
                toolItems,
                "tools"
              )}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;