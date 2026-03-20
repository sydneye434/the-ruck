import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Sprint, TeamMemberLink, TeamWithDepth } from "@the-ruck/shared";
import { api, ApiClientError } from "../../../lib/api";
import {
  calculateAverageVelocity,
  calculateTeamAvailability,
  calculateTrend,
  getConfidenceLevel,
  getVelocityWindow
} from "../../../lib/velocityEngine";
import { Card } from "../../../components/common/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { Badge } from "../../../components/common/Badge";
import { Avatar } from "../../../components/common/Avatar";
import { buildTeamTree } from "../../../lib/buildTeamTree";

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
    roleType: "team_member" | "scrum_master" | "product_owner" | "coordinator";
    coordinatorTitle?: string;
    avatar: { color: string; initials: string };
    defaultAvailabilityDays: number;
    capacityMultiplier: number;
    effectiveDays: number;
  }>;
  teams: TeamWithDepth[];
  memberships: TeamMemberLink[];
  workingDaysInSprint: number;
};

type CapacityState = {
  velocityWindow: 1 | 2 | 3 | 5;
  windowedSprints: CapacityContextResponse["completedSprints"];
  averageVelocity: number | null;
  trend: "up" | "down" | "flat" | "insufficient_data" | null;
  confidenceLevel: "high" | "medium" | "low" | "none" | null;
  daysOffMap: Record<string, number>;
  teamAvailability: ReturnType<typeof calculateTeamAvailability> | null;
  recommendedCapacity: null;
  fibSnapped: null;
  useSnap: boolean;
  manualOverride: null;
  finalCapacityTarget: null;
};

type TeamGroup = {
  id: string;
  name: string;
  color: string;
  depth: number;
  memberIds: string[];
  hasChildren: boolean;
};

type GroupedRows = {
  groups: TeamGroup[];
  unassigned: string[];
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

function roleBadge(member: CapacityContextResponse["activeMembers"][number]) {
  if (member.roleType === "coordinator") return { label: member.coordinatorTitle || "Coordinator", color: "coordinator" as const };
  if (member.roleType === "scrum_master") return { label: "Scrum Master", color: "accent" as const };
  if (member.roleType === "product_owner") return { label: "Product Owner", color: "product" as const };
  return { label: "Team Member", color: "default" as const };
}

function availabilityTone(availableDays: number, effectiveDays: number) {
  if (availableDays <= 0) return "var(--color-danger)";
  if (availableDays < effectiveDays) return "var(--color-warning)";
  return "var(--color-success)";
}

const MemberAvailabilityRow = memo(function MemberAvailabilityRow({
  member,
  breakdown,
  onDaysOffChange
}: {
  member: CapacityContextResponse["activeMembers"][number];
  breakdown: { effectiveDays: number; daysOff: number; availableDays: number };
  onDaysOffChange: (memberId: string, value: number) => void;
}) {
  const badge = roleBadge(member);
  const maxDaysOff = Math.max(0, Math.floor(member.effectiveDays));
  const barRatio = member.effectiveDays > 0 ? Math.max(0, Math.min(1, breakdown.availableDays / member.effectiveDays)) : 0;
  const tone = availabilityTone(breakdown.availableDays, member.effectiveDays);

  return (
    <div className="grid grid-cols-[minmax(180px,1fr)_120px_100px_110px_1fr] items-center gap-3 border-b border-[var(--color-border)] py-2">
      <div className="flex items-center gap-2">
        <Avatar name={member.name} color={member.avatar.color} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{member.name}</p>
          <div className="mt-0.5"><Badge label={badge.label} color={badge.color} /></div>
        </div>
      </div>

      <p
        className="text-xs text-[var(--color-text-muted)]"
        title={`${member.defaultAvailabilityDays} days × ${member.capacityMultiplier}% capacity = ${member.effectiveDays} effective days`}
      >
        {member.effectiveDays} days
      </p>

      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--color-text-muted)]">Days Off</label>
        <input
          type="number"
          min={0}
          max={maxDaysOff}
          step={1}
          value={breakdown.daysOff}
          onChange={(e) => {
            const next = Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0;
            onDaysOffChange(member.id, Math.max(0, Math.min(maxDaysOff, Math.round(next))));
          }}
          className="w-16 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-1 py-1 text-center text-sm text-[var(--color-text-primary)]"
        />
      </div>

      <p className="text-sm font-semibold transition-colors" style={{ color: tone }}>
        {breakdown.availableDays} days
      </p>

      <div className="h-2 w-20 border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div
          className="h-full transition-all duration-200"
          style={{ width: `${Math.round(barRatio * 100)}%`, background: tone }}
        />
      </div>
    </div>
  );
});

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
      setCapacityState((prev) => ({
        ...prev,
        confidenceLevel: getConfidenceLevel(res.completedSprints.length),
        teamAvailability: calculateTeamAvailability(res.activeMembers, prev.daysOffMap)
      }));
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

  const teamTree = useMemo(
    () => (context ? buildTeamTree(context.teams) : []),
    [context]
  );
  const memberIdsByTeam = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!context) return map;
    context.memberships.forEach((link) => {
      const list = map.get(link.teamId) ?? [];
      list.push(link.memberId);
      map.set(link.teamId, list);
    });
    return map;
  }, [context]);

  const membersById = useMemo(() => {
    const map = new Map<string, CapacityContextResponse["activeMembers"][number]>();
    (context?.activeMembers ?? []).forEach((member) => map.set(member.id, member));
    return map;
  }, [context]);

  const groupedRows = useMemo<GroupedRows>(() => {
    if (!context) return { groups: [], unassigned: [] };
    const assigned = new Set<string>();
    const groups: TeamGroup[] = [];

    const walk = (nodes: TeamWithDepth[]) => {
      nodes.forEach((team) => {
        const memberIds = (memberIdsByTeam.get(team.id) ?? []).filter((id) => membersById.has(id));
        memberIds.forEach((id) => assigned.add(id));
        groups.push({
          id: team.id,
          name: team.name,
          color: team.color,
          depth: team.depth,
          memberIds,
          hasChildren: (team as any).children?.length > 0
        });
        const children = ((team as any).children ?? []) as TeamWithDepth[];
        walk(children);
      });
    };
    walk(teamTree as unknown as TeamWithDepth[]);

    const unassigned = context.activeMembers
      .map((m) => m.id)
      .filter((id) => !assigned.has(id));

    return { groups, unassigned };
  }, [context, memberIdsByTeam, membersById, teamTree]);

  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setCollapsedTeams({});
  }, [sprint?.id, open]);

  const onDaysOffChange = useCallback((memberId: string, value: number) => {
    setCapacityState((prev) => {
      const daysOffMap = { ...prev.daysOffMap, [memberId]: value };
      const teamAvailability = context
        ? calculateTeamAvailability(context.activeMembers, daysOffMap)
        : prev.teamAvailability;
      return {
        ...prev,
        daysOffMap,
        teamAvailability
      };
    });
  }, [context]);

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
            <p className="text-sm text-[var(--color-text-secondary)]">Adjust for planned days off this sprint</p>

            {loading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Card key={idx} padding="sm">
                    <div className="h-10 animate-pulse bg-[var(--color-bg-tertiary)]" />
                  </Card>
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <EmptyState
                title="Could not load team availability"
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
              <div className="mt-4 flex h-[calc(100%-58px)] flex-col">
                <div className="mb-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                  <span>{formatDateRange(context.sprint.startDate, context.sprint.endDate)}</span>
                  <span className="mx-2 text-[var(--color-text-muted)]">•</span>
                  <span>{context.workingDaysInSprint} working days</span>
                </div>

                {context.activeMembers.length === 0 ? (
                  <EmptyState
                    title="No active members"
                    description="Add active team members to calculate sprint availability."
                  />
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 pb-3">
                      {groupedRows.groups.map((group) => {
                        const collapsed = collapsedTeams[group.id] ?? false;
                        const sectionBreakdown = (capacityState.teamAvailability?.memberBreakdown ?? []).filter((b) =>
                          group.memberIds.includes(b.memberId)
                        );
                        const sectionEffective = sectionBreakdown.reduce((a, b) => a + b.effectiveDays, 0);
                        const sectionDaysOff = sectionBreakdown.reduce((a, b) => a + b.daysOff, 0);
                        const sectionAvailable = sectionBreakdown.reduce((a, b) => a + b.availableDays, 0);
                        return (
                          <div key={group.id} className="mt-3">
                            <button
                              type="button"
                              onClick={() => setCollapsedTeams((prev) => ({ ...prev, [group.id]: !collapsed }))}
                              className="flex w-full items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2"
                              style={{ marginLeft: `${group.depth * 10}px` }}
                            >
                              <span className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
                                {group.name}
                                <span className="text-xs text-[var(--color-text-muted)]">({group.memberIds.length})</span>
                              </span>
                              <span className="text-xs text-[var(--color-text-muted)]">{collapsed ? "▸" : "▾"}</span>
                            </button>

                            {!collapsed ? (
                              <div style={{ marginLeft: `${group.depth * 10}px` }}>
                                {group.memberIds.map((memberId) => {
                                  const member = membersById.get(memberId);
                                  if (!member) return null;
                                  if (member.effectiveDays <= 0) {
                                    return (
                                      <div key={member.id} className="grid grid-cols-[1fr_auto] items-center border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text-muted)]">
                                        <span>{member.name}</span>
                                        <span>Not available</span>
                                      </div>
                                    );
                                  }
                                  const b =
                                    capacityState.teamAvailability?.memberBreakdown.find((x) => x.memberId === member.id) ??
                                    { effectiveDays: member.effectiveDays, daysOff: 0, availableDays: member.effectiveDays };
                                  return (
                                    <MemberAvailabilityRow
                                      key={member.id}
                                      member={member}
                                      breakdown={b}
                                      onDaysOffChange={onDaysOffChange}
                                    />
                                  );
                                })}
                                <div className="mt-1 flex items-center justify-end gap-4 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">
                                  <span>Effective: {sectionEffective.toFixed(1)}</span>
                                  <span>Days off: {sectionDaysOff.toFixed(1)}</span>
                                  <span>Available: {sectionAvailable.toFixed(1)}</span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}

                      {groupedRows.unassigned.length > 0 ? (
                        <div className="mt-4">
                          <div className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
                            Unassigned ({groupedRows.unassigned.length})
                          </div>
                          {groupedRows.unassigned.map((memberId) => {
                            const member = membersById.get(memberId);
                            if (!member || member.effectiveDays <= 0) return null;
                            const b =
                              capacityState.teamAvailability?.memberBreakdown.find((x) => x.memberId === member.id) ??
                              { effectiveDays: member.effectiveDays, daysOff: 0, availableDays: member.effectiveDays };
                            return (
                              <MemberAvailabilityRow
                                key={member.id}
                                member={member}
                                breakdown={b}
                                onDaysOffChange={onDaysOffChange}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--color-text-primary)]">Team Total</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                          <span>Effective: {capacityState.teamAvailability?.totalEffectiveDays.toFixed(1) ?? "0.0"}</span>
                          <span>Days off: {capacityState.teamAvailability?.totalDaysOff.toFixed(1) ?? "0.0"}</span>
                          <span>Available: {capacityState.teamAvailability?.totalAvailableDays.toFixed(1) ?? "0.0"}</span>
                        </div>
                        <p
                          className="font-heading text-3xl"
                          style={{
                            color:
                              (capacityState.teamAvailability?.teamAvailabilityRatio ?? 0) >= 0.9
                                ? "var(--color-success)"
                                : (capacityState.teamAvailability?.teamAvailabilityRatio ?? 0) >= 0.7
                                  ? "var(--color-warning)"
                                  : "var(--color-danger)"
                          }}
                        >
                          {Math.round((capacityState.teamAvailability?.teamAvailabilityRatio ?? 0) * 100)}%
                        </p>
                      </div>
                    </div>

                    {(capacityState.teamAvailability?.totalAvailableDays ?? 0) <= 0 ? (
                      <div className="mt-2 border border-[var(--color-danger)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-danger)]">
                        No team availability — check days off entries
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </section>

          <section className="p-5">
            <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Recommendation</h3>
            <div className="mt-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-sm text-[var(--color-text-muted)]">
              Coming soon
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                teamAvailability ratio:{" "}
                {capacityState.teamAvailability
                  ? `${Math.round(capacityState.teamAvailability.teamAvailabilityRatio * 100)}%`
                  : "-"}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

