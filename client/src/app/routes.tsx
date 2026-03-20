// Developed by Sydney Edwards
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "../layout/AppLayout";
import { TeamPage } from "../pages/team/TeamPage";
import { OrgChartPage } from "../pages/team/OrgChartPage";
import { BacklogPage } from "../pages/backlog/BacklogPage";
import { ActiveSprintPage } from "../pages/active-sprint/ActiveSprintPage";
import { SprintsPage } from "../pages/sprints/SprintsPage";
import { RetrosPage } from "../pages/retros/RetrosPage";
import { RetroDetailBoardPage } from "../pages/retros/RetroDetailBoardPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { NotFoundPage } from "../pages/NotFoundPage";

function RouteTitleSync() {
  const location = useLocation();
  useEffect(() => {
    const map: Record<string, string> = {
      "/dashboard": "Dashboard · The Ruck",
      "/backlog": "Backlog · The Ruck",
      "/sprint/active": "Active Sprint · The Ruck",
      "/sprints": "Sprint History · The Ruck",
      "/retros": "Retros · The Ruck",
      "/team": "Team · The Ruck",
      "/team/org-chart": "Org Chart · The Ruck",
      "/settings": "Settings · The Ruck"
    };
    if (location.pathname.startsWith("/retro/")) {
      document.title = "Retro Board · The Ruck";
      return;
    }
    document.title = map[location.pathname] ?? "The Ruck";
  }, [location.pathname]);
  return null;
}

export function AppRoutes() {
  return (
    <>
      <RouteTitleSync />
      <Routes>
        {/* Single layout tree so <Outlet /> always matches (avoids blank main with pathless + absolute children). */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="backlog" element={<BacklogPage />} />
          <Route path="sprint/active" element={<ActiveSprintPage />} />
          <Route path="sprints" element={<SprintsPage />} />
          <Route path="retros" element={<RetrosPage />} />
          <Route path="retro/:id" element={<RetroDetailBoardPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="team/org-chart" element={<OrgChartPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

