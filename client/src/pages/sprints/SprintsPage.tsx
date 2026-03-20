// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import type { Sprint } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { useToast } from "../../components/feedback/ToastProvider";
import { CreateSprintModal, type SprintInput } from "./components/CreateSprintModal";
import { SprintsListSkeleton } from "./components/SprintsListSkeleton";
import { CapacityPlanningPanel } from "./components/CapacityPlanningPanel";

function dateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })}`;
}

function statusLabel(sprint: Sprint) {
  if (sprint.status === "completed") return "Completed";
  if (sprint.status === "active") return "Active";
  return "Planning";
}

function statusColor(sprint: Sprint) {
  if (sprint.status === "completed") return "success" as const;
  if (sprint.status === "active") return "accent" as const;
  return "warning" as const;
}

export function SprintsPage() {
  const toast = useToast();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [capacitySprint, setCapacitySprint] = useState<Sprint | null>(null);

  const activeSprint = useMemo(() => sprints.find((s) => s.status === "active") ?? null, [sprints]);
  const sortedSprints = useMemo(
    () =>
      [...sprints].sort((a, b) => {
        const at = new Date(a.startDate).getTime();
        const bt = new Date(b.startDate).getTime();
        return bt - at;
      }),
    [sprints]
  );
  const suggestedName = `Sprint ${sprints.length + 1}`;

  async function loadSprints() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.sprints.getAll();
      setSprints(data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load sprints.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSprints();
  }, []);

  async function createSprint(input: SprintInput) {
    setCreating(true);
    try {
      await api.sprints.create({
        name: input.name,
        goal: input.goal,
        startDate: new Date(input.startDate).toISOString(),
        endDate: new Date(input.endDate).toISOString(),
        status: "planning"
      });
      toast.success("Sprint created.");
      setCreateOpen(false);
      await loadSprints();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create sprint.");
    } finally {
      setCreating(false);
    }
  }

  async function setSprintActive(sprint: Sprint) {
    if (activeSprint && activeSprint.id !== sprint.id) return;
    try {
      await api.sprints.update(sprint.id, { status: "active" });
      toast.success(`${sprint.name} is now active.`);
      await loadSprints();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to set sprint active.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sprint History"
        subtitle="Track completed velocity and manage upcoming planning sprints."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
          >
            Create Sprint
          </button>
        }
      />

      {loading ? <SprintsListSkeleton /> : null}

      {!loading && error ? (
        <EmptyState
          title="Could not load sprints"
          description={error}
          action={
            <button
              type="button"
              onClick={loadSprints}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!loading && !error && sortedSprints.length === 0 ? (
        <EmptyState
          title="No sprints yet"
          description="Create your first sprint to begin planning and tracking velocity."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
            >
              Create Sprint
            </button>
          }
        />
      ) : null}

      {!loading && !error && sortedSprints.length > 0 ? (
        <div className="space-y-2">
          {sortedSprints.map((sprint) => {
            const planning = sprint.status === "planning";
            const blockedByActive = planning && activeSprint && activeSprint.id !== sprint.id;
            return (
              <Card key={sprint.id} padding="md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{sprint.name}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">{dateRange(sprint.startDate, sprint.endDate)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={statusLabel(sprint)} color={statusColor(sprint)} />
                    {sprint.status === "completed" ? (
                      <Badge label={`${sprint.velocityDataPoint ?? 0} pts`} color="accent" />
                    ) : (
                      <Badge label="-" color="default" />
                    )}
                    {planning ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setCapacitySprint(sprint)}
                          className="border border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]"
                        >
                          Plan Sprint
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(blockedByActive)}
                          title={blockedByActive ? "Complete the current active sprint first" : "Set this sprint active"}
                          onClick={() => setSprintActive(sprint)}
                          className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Set Active
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <CreateSprintModal
        open={createOpen}
        suggestedName={suggestedName}
        submitting={creating}
        onClose={() => !creating && setCreateOpen(false)}
        onSubmit={createSprint}
      />

      <CapacityPlanningPanel
        open={Boolean(capacitySprint)}
        sprint={capacitySprint}
        onClose={() => setCapacitySprint(null)}
        onSaved={loadSprints}
      />
    </div>
  );
}

