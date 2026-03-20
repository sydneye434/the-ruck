import { useEffect, useMemo, useState } from "react";
import type { Sprint } from "@the-ruck/shared";
import { api, ApiClientError } from "../../../lib/api";
import {
  calculateAverageVelocity,
  calculateTrend,
  getConfidenceLevel,
  getVelocityWindow
} from "../../../lib/velocityEngine";
import { Card } from "../../../components/common/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { Badge } from "../../../components/common/Badge";

type CapacityContextResponse = {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    capacityTarget: number | null;
    capacitySnapshot: unknown;
  };
  completedSprints: Array<{
    id: string;
    name: string;
    completedAt: string;
    velocityDataPoint: number;
  }>;
  activeMembers: Array<{
    id: string;
    name: string;
    effectiveDays: number;
  }>;
  workingDaysInSprint: number;
};

type CapacityState = {
  velocityWindow: 1 | 2 | 3 | 5;
  windowedSprints: CapacityContextResponse["completedSprints"];
  averageVelocity: number | null;
  trend: "up" | "down" | "flat" | "insufficient_data" | null;
  confidenceLevel: "high" | "medium" | "low" | "none" | null;
  daysOffMap: Record<string, number>;
  teamAvailability: null;
  recommendedCapacity: null;
  fibSnapped: null;
  useSnap: boolean;
  manualOverride: null;
  finalCapacityTarget: null;
};

const INITIAL_CAPACITY_STATE: CapacityState = {
  velocityWindow: 3,
  windowedSprints: [],
  averageVelocity: null,
  trend: null,
  confidenceLevel: null,
  daysOffMap: {},
  teamAvailability: null,
  recommendedCapacity: null,
  fibSnapped: null,
  useSnap: true,
  manualOverride: null,
  finalCapacityTarget: null
};

function formatDateRange(startDate: string, endDate: string) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  )}`;
}

export function CapacityPlanningPanel({
  sprint,
  open,
  onClose
}: {
  sprint: Sprint | null;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<CapacityContextResponse | null>(null);
  const [capacityState, setCapacityState] = useState<CapacityState>(INITIAL_CAPACITY_STATE);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function loadContext() {
    if (!sprint) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await api.sprints.getCapacityContext(sprint.id)) as CapacityContextResponse;
      setContext(res);
      setCapacityState((prev) => ({ ...prev, confidenceLevel: getConfidenceLevel(res.completedSprints.length) }));
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load capacity context.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !sprint) return;
    setContext(null);
    setCapacityState(INITIAL_CAPACITY_STATE);
    loadContext();
  }, [open, sprint?.id]);

  const velocityDerived = useMemo(() => {
    if (!context) {
      return {
        windowedSprints: [] as CapacityContextResponse["completedSprints"],
        averageVelocity: null as number | null,
        trend: "insufficient_data" as const
      };
    }
    const windowedSprints = getVelocityWindow(context.completedSprints, capacityState.velocityWindow);
    const averageVelocity = calculateAverageVelocity(windowedSprints);
    const trend = calculateTrend(windowedSprints);
    return { windowedSprints, averageVelocity, trend };
  }, [context, capacityState.velocityWindow]);

  useEffect(() => {
    setCapacityState((prev) => ({
      ...prev,
      windowedSprints: velocityDerived.windowedSprints,
      averageVelocity: velocityDerived.averageVelocity,
      trend: velocityDerived.trend,
      confidenceLevel: context ? getConfidenceLevel(context.completedSprints.length) : null
    }));
  }, [velocityDerived.windowedSprints, velocityDerived.averageVelocity, velocityDerived.trend, context]);

  if (!open || !sprint) return null;

  const maxVelocity = Math.max(...(capacityState.windowedSprints.map((s) => s.velocityDataPoint) || [1]), 1);
  const selectedWindow = capacityState.velocityWindow;
  const actualWindow = capacityState.windowedSprints.length;
  const windowNote = actualWindow < selectedWindow;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--color-bg-primary) 72%, transparent)" }}
      />
      <aside className="absolute right-0 top-0 h-full w-[92vw] border-l border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="font-heading text-4xl text-[var(--color-text-primary)]">
            Capacity Planning - {sprint.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
          >
            X
          </button>
        </header>

        <div className="grid h-[calc(100%-74px)] grid-cols-[30%_40%_30%] gap-0">
          <section className="border-r border-[var(--color-border)] p-5">
            <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Velocity History</h3>

            {loading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} padding="sm">
                    <div className="animate-pulse">
                      <div className="h-4 w-1/2 bg-[var(--color-bg-tertiary)]" />
                      <div className="mt-2 h-3 w-2/3 bg-[var(--color-bg-tertiary)]" />
                      <div className="mt-2 h-2 w-full bg-[var(--color-bg-tertiary)]" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <EmptyState
                title="Could not load capacity context"
                description={error}
                action={
                  <button
                    type="button"
                    onClick={loadContext}
                    className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!loading && !error && context ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Average over last</p>
                  <div className="mt-2 inline-flex border border-[var(--color-border)]">
                    {[1, 2, 3, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCapacityState((prev) => ({ ...prev, velocityWindow: n as 1 | 2 | 3 | 5 }))}
                        className={[
                          "px-3 py-1.5 text-sm",
                          capacityState.velocityWindow === n
                            ? "bg-[var(--color-accent)] text-[var(--color-text-primary)]"
                            : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                        ].join(" ")}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {capacityState.windowedSprints.map((s) => {
                    const widthPct = Math.round((s.velocityDataPoint / maxVelocity) * 100);
                    return (
                      <div key={s.id} className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{s.name}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {formatDateRange(s.completedAt, s.completedAt)}
                            </p>
                          </div>
                          <p className="font-heading text-3xl text-[var(--color-text-primary)]">{s.velocityDataPoint}</p>
                        </div>
                        <div className="mt-2 h-2 border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                          <div className="h-full bg-[var(--color-accent)]" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {windowNote ? (
                  <p className="text-xs text-[var(--color-warning)]">
                    Showing {actualWindow} sprint{actualWindow === 1 ? "" : "s"} - not enough data for a{" "}
                    {selectedWindow}-sprint average
                  </p>
                ) : null}

                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Average Velocity</p>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="font-heading text-4xl text-[var(--color-text-primary)]">
                      {capacityState.averageVelocity ?? "-"}
                      <span className="ml-1 text-base text-[var(--color-text-muted)]">pts</span>
                    </p>
                    {capacityState.trend === "up" ? (
                      <span className="text-sm text-[var(--color-success)]">↑ Trending up</span>
                    ) : capacityState.trend === "down" ? (
                      <span className="text-sm text-[var(--color-danger)]">↓ Trending down</span>
                    ) : capacityState.trend === "flat" ? (
                      <span className="text-sm text-[var(--color-text-secondary)]">- Stable</span>
                    ) : (
                      <span className="text-sm text-[var(--color-text-muted)]">-</span>
                    )}
                  </div>

                  <div className="mt-2">
                    {capacityState.confidenceLevel === "high" ? (
                      <Badge label="High confidence" color="success" />
                    ) : capacityState.confidenceLevel === "medium" ? (
                      <Badge label="Medium confidence" color="warning" />
                    ) : capacityState.confidenceLevel === "low" ? (
                      <Badge label="Low confidence" color="danger" />
                    ) : (
                      <Badge label="No data yet" color="default" />
                    )}
                  </div>

                  {capacityState.confidenceLevel === "none" ? (
                    <div className="mt-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
                      No completed sprints found. You can still set a manual capacity target in the
                      recommendation panel.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="border-r border-[var(--color-border)] p-5">
            <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Team Availability</h3>
            <div className="mt-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-sm text-[var(--color-text-muted)]">
              Coming soon
            </div>
          </section>

          <section className="p-5">
            <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Recommendation</h3>
            <div className="mt-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-sm text-[var(--color-text-muted)]">
              Coming soon
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

