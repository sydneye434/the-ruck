import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { TeamPage } from "../pages/team/TeamPage";
import { BacklogPage } from "../pages/backlog/BacklogPage";
import { ActiveSprintPage } from "../pages/active-sprint/ActiveSprintPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="/backlog" element={<BacklogPage />} />
        <Route path="/sprint/active" element={<ActiveSprintPage />} />
        <Route path="/sprints" element={<PlaceholderPage title="Sprint History" />} />
        <Route path="/retros" element={<PlaceholderPage title="Retros" />} />
        <Route path="/retro/:id" element={<PlaceholderPage title="Retro Detail" />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

