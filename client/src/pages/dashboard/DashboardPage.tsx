// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api, ApiClientError } from "../../lib/api";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Avatar } from "../../components/common/Avatar";
import { SprintProgressBar } from "../../components/common/SprintProgressBar";
import { HealthScoreInfoIcon } from "../../components/common/HealthScoreInfoIcon";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { useSettings } from "../../settings/SettingsContext";

type DashboardData = Awaited<ReturnType<typeof api.dashboard.get>>;

const ACTIVITY_ICON: Record<DashboardData["recentActivity"][number]["type"], string> = {
  story_moved: "↔",
  story_created: "+",
  sprint_completed: "✓",
  retro_card_added: "📝",
  action_item_completed: "✔"
};

function healthBadgeStyle(grade: string): { background: string; color: string } {
  switch (grade) {
    case "A":
      return { background: "var(--color-success)", color: "var(--color-bg-primary)" };
    case "B":
      return { background: "color-mix(in srgb, var(--color-success) 72%, white)", color: "var(--color-bg-primary)" };
    case "C":
      return { background: "var(--color-warning)", color: "var(--color-bg-primary)" };
    case "D":
      return { background: "#f4a261", color: "var(--color-bg-primary)" };
    default:
      return { background: "var(--color-danger)", color: "var(--color-bg-primary)" };
  }
}

export function DashboardPage() {
  const { formatDate } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load(initial = false) {
    if (initial) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await api.dashboard.get();
      setData(next);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load dashboard.");
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    const id = window.setInterval(tick, 60000);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const onboarding = useMemo(() => {
    if (!data) return null;
    const hasTeam = data.teamSummary.totalMembers > 0;
    const hasSprint = Boolean(data.activeSprint) || data.velocityTrend.length > 0;
    const hasRetro = data.retroSummary.totalOpenActionItems >= 0 && Boolean(data.retroSummary.activeSprintRetro);
    return {
      hasTeam,
      hasSprint,
      hasRetro,
      isFirstTime: !hasTeam && !hasSprint && !hasRetro
    };
  }, [data]);

  const velocityAvg = useMemo(() => {
    if (!data || data.velocityTrend.length === 0) return null;
    return Math.round(
      (data.velocityTrend.reduce((sum, s) => sum + s.velocityDataPoint, 0) / data.velocityTrend.length) * 10
    ) / 10;
  }, [data]);

  const velocityTrendDirection = useMemo(() => {
    if (!data || data.velocityTrend.length < 2) return "flat";
    const first = data.velocityTrend[0].velocityDataPoint;
    const last = data.velocityTrend[data.velocityTrend.length - 1].velocityDataPoint;
    if (first > last) return "up";
    if (first < last) return "down";
    return "flat";
  }, [data]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={error ?? "Unknown error"}
        action={
          <button
            type="button"
            onClick={() => load(true)}
            className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (onboarding?.isFirstTime) {
    const steps = [
      { done: onboarding.hasTeam, label: "Add your team members", href: "/team" },
      { done: onboarding.hasSprint, label: "Create your first sprint", href: "/sprints" },
      { done: onboarding.hasRetro, label: "Start a retrospective", href: "/retros" }
    ];
    return (
      <div className="grid place-items-center py-16">
        <Card padding="md">
          <h1 className="font-heading text-4xl text-[var(--color-text-primary)]">Getting Started</h1>
          <div className="mt-4 space-y-2">
            {steps.map((s) => (
              <Link
                key={s.label}
                to={s.href}
                className={[
                  "flex items-center justify-between border p-3",
                  s.done
                    ? "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
                    : "border-[var(--color-accent)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                ].join(" ")}
              >
                <span>{s.done ? "✓" : "☐"} {s.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const active = data.activeSprint;
  const velocityEnough = data.velocityTrend.length >= 2;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle={`Last updated ${lastUpdated ? formatRelativeTime(lastUpdated) : "just now"}`}
        actions={
          <button
            type="button"
            onClick={() => load(false)}
            className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]"
            title="Refresh"
          >
            ↻
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[35%_40%_25%]">
        <div className="space-y-3">
          {active ? (
            <Card padding="md">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-3xl text-[var(--color-text-primary)]">{active.name}</h2>
                {active.healthScore ? (
                  <>
                    <span
                      className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-2 font-heading text-lg font-bold"
                      style={healthBadgeStyle(active.healthScore.grade)}
                      title={`Sprint health ${active.healthScore.total}/100 · ${
                        active.healthScore.trend === "up"
                          ? "Trending up"
                          : active.healthScore.trend === "down"
                            ? "Trending down"
                            : active.healthScore.trend === "stable"
                              ? "Stable vs last sprint"
                              : "Trend N/A"
                      }`}
                    >
                      {active.healthScore.grade}
                    </span>
                    <HealthScoreInfoIcon className="h-9" />
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-sm italic text-[var(--color-text-secondary)]">
                {active.goal?.trim() ? active.goal : "No sprint goal set"}
              </p>
              <div className="mt-2 inline-flex">
                <Badge
                  label={
                    active.isOverdue
                      ? `${Math.abs(active.daysRemaining)} days overdue`
                      : active.daysRemaining === 0
                        ? "Ends today"
                        : `${active.daysRemaining} days left`
                  }
                  color={active.isOverdue ? "danger" : active.daysRemaining <= 3 ? "warning" : "success"}
                />
              </div>
              <div className="mt-3">
                <SprintProgressBar
                  donePoints={active.completedPoints}
                  totalPoints={active.totalPoints}
                  capacityTarget={active.capacityTarget}
                  showPercentLabel={false}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
                <Badge label={`${active.storiesByColumn.backlog} Backlog`} color="default" />
                <Badge label={`${active.storiesByColumn.in_progress} In Progress`} color="warning" />
                <Badge label={`${active.storiesByColumn.in_review} In Review`} color="accent" />
                <Badge label={`${active.storiesByColumn.done} Done`} color="success" />
              </div>
              <div className="mt-4 text-center">
                <p className="font-heading text-6xl text-[var(--color-text-primary)]">{active.progressPercent}%</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {active.capacityUsedPercent == null
                    ? "no capacity target set"
                    : `capacity used: ${active.capacityUsedPercent}%`}
                </p>
              </div>
              <Link to="/sprint/active" className="mt-3 inline-block text-sm text-[var(--color-accent)] underline">
                Go to Sprint Board
              </Link>
            </Card>
          ) : (
            <EmptyState
              title="No active sprint"
              description="Create and activate a sprint to start tracking progress"
              action={
                <Link
                  to="/sprints"
                  className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
                >
                  Go to Sprints
                </Link>
              }
            />
          )}
        </div>

        <div className="space-y-3">
          <Card padding="md">
            <h3 className="font-heading text-3xl text-[var(--color-text-primary)]">Velocity Trend</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Last {Math.max(1, data.velocityTrend.length)} completed sprints
            </p>
            {velocityEnough ? (
              <>
                <div className="mt-3 h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.velocityTrend.map((v) => ({ ...v, shortName: v.name.length > 8 ? `${v.name.slice(0, 8)}...` : v.name }))}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                      <XAxis dataKey="shortName" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="velocityDataPoint" stroke="var(--color-accent)" strokeWidth={2} dot />
                      <Line type="monotone" dataKey="capacityTarget" stroke="var(--color-text-muted)" strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-heading text-4xl text-[var(--color-text-primary)]">{velocityAvg ?? "-"} <span className="text-sm text-[var(--color-text-muted)]">pts avg</span></p>
                  <Badge
                    label={
                      velocityTrendDirection === "up"
                        ? "↑ Trending up"
                        : velocityTrendDirection === "down"
                          ? "↓ Trending down"
                          : "— Stable"
                    }
                    color={velocityTrendDirection === "up" ? "success" : velocityTrendDirection === "down" ? "danger" : "default"}
                  />
                </div>
              </>
            ) : (
              <div className="mt-3 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-sm text-[var(--color-text-secondary)]">
                Complete your first sprint to start tracking velocity
              </div>
            )}
          </Card>

          <Card padding="md">
            <h3 className="font-heading text-3xl text-[var(--color-text-primary)]">Team</h3>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <Badge label={`${data.teamSummary.activeMembers} active`} color="default" />
              <Badge label={`${data.teamSummary.averageCapacityPercent}% avg`} color="accent" />
            </div>
            {data.teamSummary.membersAtReducedCapacity.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-warning)]">Reduced Capacity This Sprint</p>
                <div className="mt-2 space-y-2">
                  {data.teamSummary.membersAtReducedCapacity.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.name} color="var(--color-avatar-2)" size="sm" />
                        <span className="text-[var(--color-text-primary)]">{m.name}</span>
                      </div>
                      <span className="text-[var(--color-text-secondary)]">{m.capacityMultiplier}% · {m.effectiveDays}d</span>
                    </div>
                  ))}
                </div>
                {data.teamSummary.membersAtReducedCapacity.length > 3 ? (
                  <Link to="/team" className="mt-2 inline-block text-xs text-[var(--color-accent)] underline">
                    Show {data.teamSummary.membersAtReducedCapacity.length - 3} more
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">All members at full capacity</p>
            )}
            <Link to="/team" className="mt-3 inline-block text-sm text-[var(--color-accent)] underline">Go to Team</Link>
          </Card>
        </div>

        <div className="space-y-3">
          <Card padding="md">
            <h3 className="font-heading text-3xl text-[var(--color-text-primary)]">Retrospectives</h3>
            {data.retroSummary.activeSprintRetro ? (
              <div className="mt-2 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-2">
                <div className="flex items-center gap-2">
                  <Badge label={data.retroSummary.activeSprintRetro.phase} color="accent" />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {data.retroSummary.activeSprintRetro.cardCount} cards · {data.retroSummary.activeSprintRetro.openActionItemCount} open actions
                  </span>
                </div>
                <Link to={`/retro/${data.retroSummary.activeSprintRetro.id}`} className="mt-2 inline-block text-sm text-[var(--color-accent)] underline">
                  Open Retro
                </Link>
              </div>
            ) : (
              <div className="mt-2 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-2 text-sm text-[var(--color-text-secondary)]">
                No retro started for this sprint. <Link to="/retros" className="text-[var(--color-accent)] underline">Start Retro</Link>
              </div>
            )}
            <div className="mt-3">
              <p className="font-heading text-5xl" style={{ color: data.retroSummary.totalOpenActionItems === 0 ? "var(--color-success)" : data.retroSummary.totalOpenActionItems <= 3 ? "var(--color-warning)" : "var(--color-danger)" }}>
                {data.retroSummary.totalOpenActionItems}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">across all retrospectives</p>
            </div>
            {data.retroSummary.overdueActionItems.length > 0 ? (
              <div className="mt-3 space-y-2">
                {data.retroSummary.overdueActionItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 text-xs">
                    <p className="truncate text-[var(--color-text-primary)]">{item.description}</p>
                    <div className="ml-2 flex items-center gap-2">
                      <Avatar name={item.ownerName ?? "Unassigned"} color="var(--color-avatar-3)" size="sm" />
                      <span className="text-[var(--color-danger)]">Due {formatDate(item.dueDate ?? "")}</span>
                    </div>
                  </div>
                ))}
                {data.retroSummary.overdueActionItems.length > 3 ? (
                  <Link to="/retros" className="text-xs text-[var(--color-accent)] underline">View all</Link>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card padding="md">
            <h3 className="font-heading text-3xl text-[var(--color-text-primary)]">Recent Activity</h3>
            {data.recentActivity.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                No recent activity - start by creating a sprint or adding stories
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {data.recentActivity.map((evt, idx) => (
                  <div key={`${evt.timestamp}-${idx}`} className="border-l-2 pl-2" style={{ borderColor: evt.type === "sprint_completed" ? "var(--color-success)" : evt.type === "action_item_completed" ? "var(--color-warning)" : "var(--color-accent)" }}>
                    <p className="text-sm text-[var(--color-text-primary)]">{ACTIVITY_ICON[evt.type]} {evt.description}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatRelativeTime(evt.timestamp)}{evt.actorName ? ` · by ${evt.actorName}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
