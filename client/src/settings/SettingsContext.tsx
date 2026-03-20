// Developed by Sydney Edwards
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppSettings } from "@the-ruck/shared";
import { api } from "../lib/api";

type SettingsContextValue = {
  settings: AppSettings | null;
  loading: boolean;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  useSetting: <K extends keyof AppSettings>(key: K) => AppSettings[K] | null;
  formatDate: (date: string | Date) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function defaultFormatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await api.settings.get();
        if (mounted) setSettings(res);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    const updated = await api.settings.update(next);
    setSettings(updated);
  }

  function formatDate(date: string | Date) {
    if (!settings) return defaultFormatDate(date);
    const d = typeof date === "string" ? new Date(date) : date;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    if (settings.dateFormat === "YYYY-MM-DD") return `${y}-${m}-${day}`;
    if (settings.dateFormat === "DD/MM/YYYY") return `${day}/${m}/${y}`;
    return `${m}/${day}/${y}`;
  }

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loading,
      updateSetting,
      useSetting: (key) => (settings ? settings[key] : null),
      formatDate
    }),
    [settings, loading]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
