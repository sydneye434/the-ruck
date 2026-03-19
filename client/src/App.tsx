import { NavLink, Route, Routes } from "react-router-dom";
import ComingSoon from "./pages/ComingSoon";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/backlog", label: "Backlog" },
  { to: "/active-sprint", label: "Active Sprint" },
  { to: "/sprints", label: "Sprints" },
  { to: "/retros", label: "Retros" },
  { to: "/team", label: "Team" },
  { to: "/settings", label: "Settings" }
];

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        <aside className="w-64 border-r border-white/10 px-4 py-6 hidden lg:block">
          <div className="px-2">
            <div className="text-xs font-mono text-white/60">THE RUCK</div>
            <div className="mt-1 text-lg font-semibold">Sprint & ceremony flow</div>
          </div>

          <nav className="mt-8 space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "block rounded border px-3 py-2 text-sm font-mono transition",
                    isActive
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-transparent text-white/70 hover:border-white/10 hover:bg-white/5"
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ComingSoon title="Dashboard" />} />
            {nav.map((item) => (
              <Route
                key={item.to}
                path={item.to}
                element={<ComingSoon title={item.label} />}
              />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}

