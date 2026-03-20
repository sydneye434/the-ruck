// Developed by Sydney Edwards
import { AppRoutes } from "./app/routes";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./components/feedback/ToastProvider";
import { SettingsProvider } from "./settings/SettingsContext";

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

