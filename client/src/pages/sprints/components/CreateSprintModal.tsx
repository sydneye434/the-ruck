// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "../../../components/feedback/Spinner";
import { useSettings } from "../../../settings/SettingsContext";

type SprintInput = {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
};

type Errors = Partial<Record<keyof SprintInput, string>>;

function validate(input: SprintInput): Errors {
  const errors: Errors = {};
  if (!input.name.trim()) errors.name = "Sprint name is required.";
  if (!input.startDate) errors.startDate = "Start date is required.";
  if (!input.endDate) errors.endDate = "End date is required.";
  if (input.startDate && input.endDate) {
    const s = new Date(input.startDate);
    const e = new Date(input.endDate);
    if (e.getTime() <= s.getTime()) {
      errors.endDate = "End date must be after start date.";
    }
  }
  if (input.goal.length > 280) errors.goal = "Goal must be 280 characters or fewer.";
  return errors;
}

export function CreateSprintModal({
  open,
  suggestedName,
  submitting,
  onClose,
  onSubmit
}: {
  open: boolean;
  suggestedName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: SprintInput) => Promise<void>;
}) {
  const { settings } = useSettings();
  const [input, setInput] = useState<SprintInput>({
    name: suggestedName,
    goal: "",
    startDate: "",
    endDate: ""
  });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setInput({ name: suggestedName, goal: "", startDate: "", endDate: "" });
    setErrors({});
  }, [open, suggestedName]);

  const goalCounterColor = useMemo(
    () => (input.goal.length > 280 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"),
    [input.goal.length]
  );

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({
      ...input,
      name: input.name.trim(),
      goal: input.goal.trim()
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "color-mix(in srgb, var(--color-bg-primary) 80%, transparent)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5"
      >
        <h2 className="font-heading text-4xl text-[var(--color-text-primary)]">Create Sprint</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Define a new sprint and keep it in planning until you set it active.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-[var(--color-text-primary)]">Sprint name</label>
            <input
              value={input.name}
              onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
            />
            {errors.name ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.name}</p> : null}
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-primary)]">Sprint goal (optional)</label>
            <textarea
              value={input.goal}
              maxLength={320}
              onChange={(e) => setInput((prev) => ({ ...prev, goal: e.target.value }))}
              rows={4}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.goal ? <p className="text-sm text-[var(--color-danger)]">{errors.goal}</p> : <span />}
              <span className={`text-xs ${goalCounterColor}`}>{input.goal.length} / 280</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-[var(--color-text-primary)]">Start date</label>
              <input
                type="date"
                value={input.startDate}
                onChange={(e) =>
                  setInput((prev) => {
                    const startDate = e.target.value;
                    if (!startDate || !settings) return { ...prev, startDate };
                    const days = Math.max(1, settings.sprintLengthDays);
                    const end = new Date(startDate);
                    end.setDate(end.getDate() + days - 1);
                    return { ...prev, startDate, endDate: end.toISOString().slice(0, 10) };
                  })
                }
                className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
              />
              {errors.startDate ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.startDate}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-primary)]">End date</label>
              <input
                type="date"
                value={input.endDate}
                onChange={(e) => setInput((prev) => ({ ...prev, endDate: e.target.value }))}
                className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
              />
              {errors.endDate ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.endDate}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
          >
            {submitting ? <Spinner size="sm" /> : null}
            Create Sprint
          </button>
        </div>
      </form>
    </div>
  );
}

export type { SprintInput };

