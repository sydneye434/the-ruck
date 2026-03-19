import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { useSidebarState } from "./useSidebarState";

export function AppLayout() {
  const { isCollapsed, toggleSidebar } = useSidebarState();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]">
      <Sidebar collapsed={isCollapsed} onToggleCollapsed={toggleSidebar} />
      <main className="w-full min-w-0 p-5 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}

