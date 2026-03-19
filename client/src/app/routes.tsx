import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { PlaceholderPage } from "../pages/PlaceholderPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="/backlog" element={<PlaceholderPage title="Backlog" />} />
        <Route path="/sprint/active" element={<PlaceholderPage title="Active Sprint" />} />
        <Route path="/sprints" element={<PlaceholderPage title="Sprint History" />} />
        <Route path="/retros" element={<PlaceholderPage title="Retros" />} />
        <Route path="/retro/:id" element={<PlaceholderPage title="Retro Detail" />} />
        <Route path="/team" element={<PlaceholderPage title="Team" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

