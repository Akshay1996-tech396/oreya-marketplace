"use client";

import { useEffect } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export type DetailActionTab<TabKey extends string = string> = {
  key: TabKey;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};

type DetailActionTabsProps<TabKey extends string> = {
  id: string;
  tabs: DetailActionTab<TabKey>[];
  activeKey: TabKey;
  onChange: (key: TabKey) => void;
  ariaLabel: string;
};

export default function DetailActionTabs<TabKey extends string>({
  id,
  tabs,
  activeKey,
  onChange,
  ariaLabel,
}: DetailActionTabsProps<TabKey>) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const activePanel = document.getElementById(`${id}-${activeKey}-panel`);

    if (!activePanel) {
      return;
    }

    const animation = activePanel.animate(
      [
        {
          opacity: 0,
          transform: "translateY(8px)",
        },
        {
          opacity: 1,
          transform: "translateY(0)",
        },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );

    return () => {
      animation.cancel();
    };
  }, [activeKey, id]);

  function focusTab(key: TabKey) {
    if (typeof document === "undefined") {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(`${id}-${key}-tab`)?.focus();
    });
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const enabledTabs = tabs
      .map((tab, index) => ({ tab, index }))
      .filter(({ tab }) => !tab.disabled);

    if (enabledTabs.length === 0) {
      return;
    }

    const enabledIndex = enabledTabs.findIndex(
      ({ index }) => index === currentIndex
    );

    let nextEnabledIndex = enabledIndex;

    if (event.key === "Home") {
      nextEnabledIndex = 0;
    } else if (event.key === "End") {
      nextEnabledIndex = enabledTabs.length - 1;
    } else if (event.key === "ArrowRight") {
      nextEnabledIndex =
        enabledIndex >= 0
          ? (enabledIndex + 1) % enabledTabs.length
          : 0;
    } else if (event.key === "ArrowLeft") {
      nextEnabledIndex =
        enabledIndex >= 0
          ? (enabledIndex - 1 + enabledTabs.length) % enabledTabs.length
          : enabledTabs.length - 1;
    }

    const nextTab = enabledTabs[nextEnabledIndex]?.tab;

    if (!nextTab) {
      return;
    }

    onChange(nextTab.key);
    focusTab(nextTab.key);
  }

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex min-w-0 items-end gap-7 overflow-x-auto border-b border-[#d8d8d8] scroll-smooth"
      >
        {tabs.map((tab, index) => {
          const isActive = activeKey === tab.key;
          const tabId = `${id}-${tab.key}-tab`;
          const panelId = `${id}-${tab.key}-panel`;

          return (
            <button
              key={tab.key}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`relative shrink-0 whitespace-nowrap border-b-2 pb-3 font-heading capitalize tracking-[0.03em] outline-none transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 ${
                isActive
                  ? "-translate-y-[1px] border-black text-[20px] text-black"
                  : "border-transparent text-[18px] text-[#9b9b9b] hover:-translate-y-[1px] hover:text-[#333333]"
              } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-5">
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          const tabId = `${id}-${tab.key}-tab`;
          const panelId = `${id}-${tab.key}-panel`;

          return (
            <div
              key={tab.key}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              hidden={!isActive}
              className={isActive ? "min-w-0" : "hidden"}
            >
              <div className="min-w-0 rounded-[20px] border border-[#e5e0d8] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.04)] transition-shadow duration-300 ease-out sm:p-6">
                {tab.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}