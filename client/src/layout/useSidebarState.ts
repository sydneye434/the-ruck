// Developed by Sydney Edwards
import { useEffect, useState } from "react";

const STORAGE_KEY = "the-ruck-sidebar-collapsed";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return {
    isCollapsed,
    toggleSidebar: () => setIsCollapsed((prev) => !prev)
  };
}

