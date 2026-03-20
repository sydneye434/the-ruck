import { useEffect, useMemo, useState } from "react";
import type { Retro, Sprint } from "@the-ruck/shared";
import { Badge } from "../../../components/common/Badge";
import { Spinner } from "../../../components/feedback/Spinner";
import { RETRO_TEMPLATES, type RetroTemplateId } from "../../../lib/retroTemplates";
import { useSettings } from "../../../settings/SettingsContext";

function statusColor(status: Sprint["status"]) {
  if (status === "active") return "accent" as const;
  if (status === "completed") return "success" as const;
  return "warning" as const;
}

export function CreateRetroModal({
  open,
  sprints,
  retros,
  submitting,
  onClose,
  onSubmit
}: {
  open: boolean;
  sprints: Sprint[];
  retros: Retro[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    sprintId: string;
    template: RetroTemplateId;
    title: string;
    isAnonymous: boolean;
  }) => Promise<void>;
}) {
  const { settings, formatDate } = useSettings();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sprintId, setSprintId] = useState("");
  const [template, setTemplate] = useState<RetroTemplateId>("start_stop_continue");
  const [title, setTitle] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const usedSprintIds = useMemo(() => new Set(retros.map((r) => r.sprintId)), [retros]);
  const availableSprints = useMemo(() => sprints.filter((s) => !usedSprintIds.has(s.id)), [sprints, usedSprintIds]);
  const selectedSprint = useMemo(() => availableSprints.find((s) => s.id === sprintId) ?? null, [availableSprints, sprintId]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTemplate((settings?.defaultRetroTemplate ?? "start_stop_continue") as RetroTemplateId);
    setIsAnonymous(settings?.defaultAnonymous ?? false);
    const activeWithoutRetro = sprints.find((s) => s.status === "active" && !usedSprintIds.has(s.id));
    const first = activeWithoutRetro ?? availableSprints[0] ?? null;
    setSprintId(first?.id ?? "");
    setTitle(first ? `${first.name} Retrospective` : "");
  }, [open, sprints, availableSprints, usedSprintIds, settings?.defaultRetroTemplate, settings?.defaultAnonymous]);

  useEffect(() => {
    if (!selectedSprint) return;
    if (!title.trim() || title.endsWith("Retrospective")) {
      setTitle(`${selectedSprint.name} Retrospective`);
    }
  }, [selectedSprint?.id]);

  if (!open) return null;

  const disableSprintSelection = availableSprints.length === 0;
  const canProceedStep1 = Boolean(sprintId);
  const canCreate = Boolean(sprintId && template && title.trim());

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "color-mix(in srgb, var(--color-bg-primary) 80%, transparent)" }}
    >
      <div className="w-full max-w-3xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
        <h2 className="font-heading text-4xl text-[var(--color-text-primary)]">New Retro</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Step {step} of 3</p>

        {step === 1 ? (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Choose Sprint</h3>
            {disableSprintSelection ? (
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-sm text-[var(--color-text-muted)]">
                All sprints have an associated retro.
              </div>
            ) : (
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                {availableSprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {formatDate(s.startDate)} - {formatDate(s.endDate)} - {s.status}
                  </option>
                ))}
              </select>
            )}
            {selectedSprint ? (
              <div className="inline-flex">
                <Badge label={selectedSprint.status} color={statusColor(selectedSprint.status)} />
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Choose Template</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              {(Object.keys(RETRO_TEMPLATES) as RetroTemplateId[]).map((key) => {
                const t = RETRO_TEMPLATES[key];
                const selected = template === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTemplate(key)}
                    className={[
                      "border p-3 text-left",
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-bg-tertiary)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-primary)]"
                    ].join(" ")}
                  >
                    <p className="font-heading text-2xl text-[var(--color-text-primary)]">{t.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.columns.map((c) => (
                        <span
                          key={c.key}
                          className="inline-flex items-center border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
                        >
                          <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ background: `var(${c.color})` }} />
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Options</h3>
            <div>
              <label className="block text-sm text-[var(--color-text-primary)]">Retro title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
              />
            </div>
            <label className="flex items-start gap-2 border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm text-[var(--color-text-primary)]">Anonymous mode</span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  When on, card authors are hidden from all team members
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
            >
              Cancel
            </button>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                disabled={submitting}
                className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
              >
                Back
              </button>
            ) : null}
          </div>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3)}
              disabled={(step === 1 && !canProceedStep1) || submitting}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-60"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!canCreate || submitting}
              onClick={() =>
                onSubmit({
                  sprintId,
                  template,
                  title: title.trim(),
                  isAnonymous
                })
              }
              className="inline-flex items-center gap-2 border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-60"
            >
              {submitting ? <Spinner size="sm" /> : null}
              Create Retro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
