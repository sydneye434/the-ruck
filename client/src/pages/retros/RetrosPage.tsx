import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Retro, RetroActionItem, RetroCard, Sprint } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { RETRO_TEMPLATES } from "../../lib/retroTemplates";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useToast } from "../../components/feedback/ToastProvider";
import { RetrosListSkeleton } from "./components/RetrosListSkeleton";
import { CreateRetroModal } from "./components/CreateRetroModal";

type RetroDetail = {
  retro: Retro;
  cards: RetroCard[];
  actionItems: RetroActionItem[];
};

function dateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })}`;
}

const PHASE_ORDER: Retro["phase"][] = ["reflect", "discuss", "action_items"];
function phaseLabel(phase: Retro["phase"]) {
  if (phase === "closed") return "Closed";
  if (phase === "action_items") return "Action Items";
  if (phase === "discuss") return "Discuss";
  return "Reflect";
}

function sprintStatusColor(status: Sprint["status"]) {
  if (status === "active") return "accent" as const;
  if (status === "completed") return "success" as const;
  return "warning" as const;
}

export function RetrosPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [retros, setRetros] = useState<Array<Retro & { openActionItemCount?: number }>>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [detailsByRetroId, setDetailsByRetroId] = useState<Record<string, RetroDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const sprintById = useMemo(() => new Map(sprints.map((s) => [s.id, s])), [sprints]);
  const activeSprint = useMemo(() => sprints.find((s) => s.status === "active") ?? null, [sprints]);

  const activeRetro = useMemo(() => {
    if (!activeSprint) return null;
    return retros.find((r) => r.sprintId === activeSprint.id) ?? null;
  }, [retros, activeSprint]);

  const pastRetros = useMemo(
    () =>
      retros
        .filter((r) => r.phase !== "closed")
        .filter((r) => !activeRetro || r.id !== activeRetro.id)
        .sort((a, b) => {
          const as = sprintById.get(a.sprintId);
          const bs = sprintById.get(b.sprintId);
          return new Date(bs?.startDate ?? 0).getTime() - new Date(as?.startDate ?? 0).getTime();
        }),
    [retros, activeRetro, sprintById]
  );
  const closedRetros = useMemo(
    () =>
      retros
        .filter((r) => r.phase === "closed")
        .sort((a, b) => {
          const as = sprintById.get(a.sprintId);
          const bs = sprintById.get(b.sprintId);
          return new Date(bs?.startDate ?? 0).getTime() - new Date(as?.startDate ?? 0).getTime();
        }),
    [retros, sprintById]
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [retrosData, sprintsData] = await Promise.all([api.retros.getAll(), api.sprints.getAll()]);
      setRetros(retrosData);
      setSprints(sprintsData);
      const details = await Promise.all(
        retrosData.map(async (retro) => {
          const detail = (await api.retros.getById(retro.id)) as unknown as RetroDetail;
          return [retro.id, detail] as const;
        })
      );
      setDetailsByRetroId(Object.fromEntries(details));
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load retrospectives.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createRetro(payload: {
    sprintId: string;
    template: "start_stop_continue" | "4ls" | "mad_sad_glad";
    title: string;
    isAnonymous: boolean;
  }) {
    setCreating(true);
    try {
      const created = await api.retros.create({
        sprintId: payload.sprintId,
        template: payload.template,
        title: payload.title,
        isAnonymous: payload.isAnonymous,
        phase: "reflect"
      });
      toast.success("Retro created.");
      setCreateOpen(false);
      navigate(`/retro/${created.id}`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create retro.");
    } finally {
      setCreating(false);
    }
  }

  function renderRetroRow(retro: Retro & { openActionItemCount?: number }) {
    const sprint = sprintById.get(retro.sprintId);
    const details = detailsByRetroId[retro.id];
    const cardCount = details?.cards.length ?? 0;
    const openActionItemsCount =
      retro.openActionItemCount ?? details?.actionItems.filter((i) => i.status === "open" || i.status === "in_progress").length ?? 0;
    const actionItemCount = details?.actionItems.length ?? 0;
    const template = RETRO_TEMPLATES[retro.template];
    const phaseIndex = PHASE_ORDER.indexOf(retro.phase);
    return (
      <Card key={retro.id} padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              {sprint?.name ?? "Unknown Sprint"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>{sprint ? dateRange(sprint.startDate, sprint.endDate) : "No sprint dates"}</span>
              {sprint ? <Badge label={sprint.status} color={sprintStatusColor(sprint.status)} /> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge label={template?.name ?? retro.template} color="default" />
            <div className="flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
              <span>{phaseLabel(retro.phase)}</span>
              <span className="ml-1 inline-flex items-center gap-1">
                {PHASE_ORDER.map((p, idx) => (
                  <span
                    key={p}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        idx <= phaseIndex ? "var(--color-accent)" : "var(--color-border)"
                    }}
                  />
                ))}
              </span>
            </div>
            <Badge label={`${cardCount} cards`} color="default" />
            {retro.phase === "closed" ? <Badge label={`${actionItemCount} action items`} color="default" /> : null}
            <span
              className="text-xs"
              style={{ color: openActionItemsCount > 0 ? "var(--color-warning)" : "var(--color-text-muted)" }}
            >
              {openActionItemsCount} open actions
            </span>
            {retro.isAnonymous ? <Badge label="Anonymous" color="warning" /> : null}
            {retro.phase === "closed" ? <Badge label="Closed" color="default" /> : null}
            <button
              type="button"
              onClick={() => navigate(`/retro/${retro.id}`)}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)]"
            >
              Open Retro
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Retrospectives"
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
          >
            New Retro
          </button>
        }
      />

      {loading ? <RetrosListSkeleton /> : null}

      {!loading && error ? (
        <EmptyState
          title="Could not load retrospectives"
          description={error}
          action={
            <button
              type="button"
              onClick={loadData}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!loading && !error && retros.length === 0 ? (
        <EmptyState
          title="No retrospectives yet"
          description="Start your first retro to capture feedback and action items."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
            >
              Create first retro
            </button>
          }
        />
      ) : null}

      {!loading && !error && retros.length > 0 ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Active Sprint
            </h2>
            {activeRetro && activeRetro.phase !== "closed" ? renderRetroRow(activeRetro) : (
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
                No retro started for the active sprint yet.{" "}
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="underline text-[var(--color-accent)]"
                >
                  Start Retro
                </button>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Past Retros
            </h2>
            {pastRetros.length > 0 ? pastRetros.map(renderRetroRow) : (
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-muted)]">
                No past retros yet.
              </div>
            )}
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Closed Retros
            </h2>
            {closedRetros.length > 0 ? (
              <div className="space-y-2 opacity-80">
                {closedRetros.map(renderRetroRow)}
              </div>
            ) : (
              <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-muted)]">
                No closed retros yet.
              </div>
            )}
          </section>
        </div>
      ) : null}

      <CreateRetroModal
        open={createOpen}
        sprints={sprints}
        retros={retros}
        submitting={creating}
        onClose={() => !creating && setCreateOpen(false)}
        onSubmit={createRetro}
      />
    </div>
  );
}
