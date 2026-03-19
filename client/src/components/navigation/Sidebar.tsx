import { NavLink } from "react-router-dom";
import type { ComponentType, SVGProps } from "react";
import { CollapseIcon, DashboardIcon, BacklogIcon, HistoryIcon, MoonIcon, RetrosIcon, RuckMarkIcon, SettingsIcon, SprintIcon, SunIcon, TeamIcon } from "./Icons";
import { useTheme } from "../../theme/ThemeProvider";

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const primaryNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: DashboardIcon },
  { label: "Backlog", to: "/backlog", icon: BacklogIcon },
  { label: "Active Sprint", to: "/sprint/active", icon: SprintIcon },
  { label: "Sprint History", to: "/sprints", icon: HistoryIcon },
  { label: "Retros", to: "/retros", icon: RetrosIcon },
  { label: "Team", to: "/team", icon: TeamIcon }
];

const settingsNav: NavItem = { label: "Settings", to: "/settings", icon: SettingsIcon };

function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 border px-3 py-2 text-sm font-medium transition",
          collapsed ? "justify-center" : "",
          isActive
            ? "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
            : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]"
        ].join(" ")
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={[
        "border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]",
        "flex h-screen flex-col px-3 py-4 transition-[width]",
        collapsed ? "w-[76px]" : "w-[280px]"
      ].join(" ")}
    >
      <div className={["flex items-center", collapsed ? "justify-center" : "justify-between"].join(" ")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="grid h-9 w-9 place-items-center border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]">
            <RuckMarkIcon className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-heading text-xl leading-none text-[var(--color-text-primary)]">The Ruck</p>
              <p className="truncate text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Scrum-native flow
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="grid h-8 w-8 place-items-center border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Collapse sidebar"
          >
            <CollapseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mt-4 grid h-8 w-full place-items-center border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="Expand sidebar"
        >
          <CollapseIcon className="h-4 w-4 rotate-180" />
        </button>
      )}

      <nav className="mt-6 flex flex-col gap-1">
        {primaryNav.map((item) => (
          <NavItemRow key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <NavItemRow item={settingsNav} collapsed={collapsed} />

        <button
          type="button"
          onClick={toggleTheme}
          className={["flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]", collapsed ? "justify-center" : ""].join(" ")}
          title={collapsed ? "Toggle theme" : undefined}
        >
          {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
      </div>
    </aside>
  );
}

