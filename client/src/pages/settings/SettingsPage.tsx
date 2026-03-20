import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { ConfirmDialog } from "../../components/dialog/ConfirmDialog";
import { Spinner } from "../../components/feedback/Spinner";
import { useSettings } from "../../settings/SettingsContext";
import { useTheme } from "../../theme/ThemeProvider";
import { useToast } from "../../components/feedback/ToastProvider";
import { api } from "../../lib/api";
import { RETRO_TEMPLATES, type RetroTemplateId } from "../../lib/retroTemplates";
import { useNavigate } from "react-router-dom";

export function SettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { settings, loading, updateSetting } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [typeResetOpen, setTypeResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");

  if (loading || !settings) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await api.data.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `the-ruck-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export successful");
    } catch {
      toast.error("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await api.data.resetAll();
      toast.success("Data reset complete");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to reset data. Please try again.");
    } finally {
      setResetting(false);
      setTypeResetOpen(false);
      setResetText("");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Defaults and workspace configuration" />

      <Card padding="md">
        <h2 className="font-heading text-2xl text-[var(--color-text-primary)]">Sprint Defaults</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[var(--color-text-primary)]">
            Default sprint length (days)
            <input
              type="number"
              min={1}
              max={90}
              value={settings.sprintLengthDays}
              onChange={(e) => void updateSetting("sprintLengthDays", Math.min(90, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2"
            />
          </label>
          <div>
            <p className="text-sm text-[var(--color-text-primary)]">Default velocity window</p>
            <div className="mt-1 inline-flex border border-[var(--color-border)]">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => void updateSetting("velocityWindow", n as 1 | 2 | 3 | 5)}
                  className={["px-3 py-2 text-sm", settings.velocityWindow === n ? "bg-[var(--color-accent)] text-[var(--color-text-primary)]" : "bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-primary)]">Story point scale</p>
            <div className="mt-1 inline-flex border border-[var(--color-border)]">
              {["fibonacci", "tshirt"].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => void updateSetting("storyPointScale", scale as "fibonacci" | "tshirt")}
                  className={["px-3 py-2 text-sm uppercase", settings.storyPointScale === scale ? "bg-[var(--color-accent)] text-[var(--color-text-primary)]" : "bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"].join(" ")}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <h2 className="font-heading text-2xl text-[var(--color-text-primary)]">Retro Defaults</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[var(--color-text-primary)]">
            Default retro template
            <select
              value={settings.defaultRetroTemplate}
              onChange={(e) => void updateSetting("defaultRetroTemplate", e.target.value as RetroTemplateId)}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2"
            >
              {(Object.keys(RETRO_TEMPLATES) as RetroTemplateId[]).map((key) => (
                <option key={key} value={key}>
                  {RETRO_TEMPLATES[key].name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              checked={settings.defaultAnonymous}
              onChange={(e) => void updateSetting("defaultAnonymous", e.target.checked)}
            />
            Default anonymous mode
          </label>
        </div>
      </Card>

      <Card padding="md">
        <h2 className="font-heading text-2xl text-[var(--color-text-primary)]">Display</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <button type="button" onClick={toggleTheme} className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-left text-sm">
            Theme: {theme === "dark" ? "Dark" : "Light"}
          </button>
          <label className="text-sm text-[var(--color-text-primary)]">
            Date format
            <select
              value={settings.dateFormat}
              onChange={(e) => void updateSetting("dateFormat", e.target.value as "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD")}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </label>
        </div>
      </Card>

      <Card padding="md">
        <h2 className="font-heading text-2xl text-[var(--color-text-primary)]">Data Management</h2>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="inline-flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm"
          >
            {exporting ? <Spinner size="sm" /> : null}
            Export all data
          </button>
        </div>
        <div className="mt-4 border border-[var(--color-danger)] p-3">
          <p className="text-sm text-[var(--color-danger)]">Danger zone: this will replace all current data with fresh seed data.</p>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="mt-2 border border-[var(--color-danger)] bg-[var(--color-danger)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
          >
            Reset All Data
          </button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset all data?"
        description="This clears all current data and reseeds the app."
        confirmLabel="Continue"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false);
          setTypeResetOpen(true);
        }}
      />

      {typeResetOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "color-mix(in srgb, var(--color-bg-primary) 80%, transparent)" }}>
          <div className="w-full max-w-md border border-[var(--color-danger)] bg-[var(--color-bg-secondary)] p-5">
            <h3 className="font-heading text-3xl text-[var(--color-text-primary)]">Type RESET to confirm</h3>
            <input
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
              className="mt-3 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setTypeResetOpen(false)} className="border border-[var(--color-border)] px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                disabled={resetText !== "RESET" || resetting}
                onClick={handleReset}
                className="inline-flex items-center gap-2 border border-[var(--color-danger)] bg-[var(--color-danger)] px-3 py-2 text-sm text-[var(--color-text-primary)] disabled:opacity-60"
              >
                {resetting ? <Spinner size="sm" /> : null}
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
