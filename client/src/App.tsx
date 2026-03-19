import { AppRoutes } from "./app/routes";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./components/feedback/ToastProvider";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </ThemeProvider>
  );
}

