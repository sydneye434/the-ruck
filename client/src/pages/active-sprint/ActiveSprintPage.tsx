// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import type { Sprint, Story, StoryBoardColumn, TeamMember } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { ConfirmDialog } from "../../components/dialog/ConfirmDialog";
import { useToast } from "../../components/feedback/ToastProvider";
import { Card } from "../../components/common/Card";
import { SprintProgressBar } from "../../components/common/SprintProgressBar";
import { StoryDetailDrawer, type SaveState } from "../backlog/components/StoryDetailDrawer";
import { PlanningPokerModal } from "../../components/poker/PlanningPokerModal";
import { KanbanColumn } from "./components/KanbanColumn";
import { SprintBoardSkeleton } from "./components/SprintBoardSkeleton";
import { StoryCardPreview } from "./components/StoryCardPreview";
import {
  SprintBurndownChart,
  type BurndownApiPayload
} from "../../components/burndown/SprintBurndownChart";
import {
  SprintHealthPanel,
  type SprintHealthApiPayload
} from "./components/SprintHealthPanel";

const COLUMN_ORDER: StoryBoardColumn[] = ["backlog", "in_progress", "in_review", "done"];

function dateRangeText(startDate: string, endDate: string) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })}`;
}

function daysRemainingText(endDate: string) {
  const now = new Date();
  const end = new Date(endDate);
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Ends today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function storiesByColumn(stories: Story[]) {
  return {
    backlog: stories.filter((s) => s.boardColumn === "backlog"),
    in_progress: stories.filter((s) => s.boardColumn === "in_progress"),
    in_review: stories.filter((s) => s.boardColumn === "in_review"),
    done: stories.filter((s) => s.boardColumn === "done")
  };
}

function reorderOptimistic(
  current: Story[],
  activeStoryId: string,
  overId: string,
  destinationColumn: StoryBoardColumn
) {
  const byColumn = storiesByColumn(current);
  const sourceColumn = COLUMN_ORDER.find((col) => byColumn[col].some((s) => s.id === activeStoryId));
  if (!sourceColumn) return current;

  const sourceIds = byColumn[sourceColumn].map((s) => s.id).filter((id) => id !== activeStoryId);
  const destinationIds = byColumn[destinationColumn]
    .map((s) => s.id)
    .filter((id) => id !== activeStoryId);

  const isOverColumn = COLUMN_ORDER.includes(overId as StoryBoardColumn);
  const destinationIndex = isOverColumn
    ? destinationIds.length
    : Math.max(destinationIds.indexOf(overId), 0);
  destinationIds.splice(destinationIndex, 0, activeStoryId);

  if (sourceColumn === destinationColumn) {
    const reorderedStories = destinationIds
      .map((id) => current.find((story) => story.id === id))
      .filter(Boolean) as Story[];
    const untouched = current.filter((story) => story.boardColumn !== sourceColumn);
    return [...untouched, ...reorderedStories];
  }

  const sourceStories = sourceIds
    .map((id) => current.find((story) => story.id === id))
    .filter(Boolean) as Story[];
  const destinationStories = destinationIds
    .map((id) => {
      const story = current.find((candidate) => candidate.id === id);
      if (!story) return null;
      if (story.id === activeStoryId) return { ...story, boardColumn: destinationColumn };
      return story;
    })
    .filter(Boolean) as Story[];
  const untouched = current.filter(
    (story) => story.boardColumn !== sourceColumn && story.boardColumn !== destinationColumn
  );

  return [...untouched, ...sourceStories, ...destinationStories];
}

export function ActiveSprintPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeDragStoryId, setActiveDragStoryId] = useState<string | null>(null);
  const [sprintTab, setSprintTab] = useState<"board" | "burndown" | "health">("board");
  const [burndownData, setBurndownData] = useState<BurndownApiPayload | null>(null);
  const [burndownLoading, setBurndownLoading] = useState(false);
  const [healthData, setHealthData] = useState<SprintHealthApiPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [pokerOpen, setPokerOpen] = useState(false);

  const membersById = useMemo(() => {
    const map = new Map<string, TeamMember>();
    teamMembers.forEach((member) => map.set(member.id, member));
    return map;
  }, [teamMembers]);

  const columnData = useMemo(() => storiesByColumn(stories), [stories]);
  const totalPoints = useMemo(() => stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0), [stories]);
  const donePoints = useMemo(
    () =>
      stories.filter((s) => s.boardColumn === "done").reduce((sum, s) => sum + (s.storyPoints ?? 0), 0),
    [stories]
  );
  const capacityTarget = activeSprint?.capacityTarget ?? null;

  const dragStory = useMemo(
    () => stories.find((story) => story.id === activeDragStoryId) ?? null,
    [activeDragStoryId, stories]
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [allSprints, allMembers] = await Promise.all([api.sprints.getAll(), api.teamMembers.getAll()]);
      setAllSprints(allSprints);
      const sprint = allSprints.find((candidate) => candidate.status === "active") ?? null;
      setActiveSprint(sprint);
      setTeamMembers(allMembers);
      if (sprint) {
        const sprintStories = await api.stories.getAll({ sprintId: sprint.id });
        setStories(sprintStories);
      } else {
        setStories([]);
      }
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load active sprint.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (sprintTab !== "burndown" || !activeSprint) return;
    let cancelled = false;
    (async () => {
      setBurndownLoading(true);
      try {
        const raw = await api.sprints.getBurndown(activeSprint.id);
        if (!cancelled) {
          setBurndownData(raw as BurndownApiPayload);
        }
      } catch {
        if (!cancelled) setBurndownData(null);
      } finally {
        if (!cancelled) setBurndownLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sprintTab, activeSprint?.id]);

  useEffect(() => {
    if (sprintTab !== "health" || !activeSprint) return;
    let cancelled = false;
    (async () => {
      setHealthLoading(true);
      try {
        const raw = await api.sprints.getHealth(activeSprint.id);
        if (!cancelled) setHealthData(raw);
      } catch {
        if (!cancelled) setHealthData(null);
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sprintTab, activeSprint?.id]);

  async function completeSprint() {
    if (!activeSprint) return;
    setCompleting(true);
    try {
      await api.sprints.complete(activeSprint.id);
      toast.success("Sprint completed and velocity recorded.");
      navigate("/sprints");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to complete sprint.");
    } finally {
      setCompleting(false);
      setShowCompleteConfirm(false);
    }
  }

  async function handleDragStart(event: DragStartEvent) {
    setActiveDragStoryId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setActiveDragStoryId(null);
    if (!overId) return;

    const destinationColumn = COLUMN_ORDER.includes(overId as StoryBoardColumn)
      ? (overId as StoryBoardColumn)
      : stories.find((story) => story.id === overId)?.boardColumn;
    if (!destinationColumn) return;

    const previous = stories;
    const next = reorderOptimistic(previous, activeId, overId, destinationColumn);
    setStories(next);

    try {
      const story = previous.find((item) => item.id === activeId);
      if (!story) return;
      await api.stories.update(activeId, { boardColumn: destinationColumn });
      toast.info("Story moved.");
      if (sprintTab === "burndown" && activeSprint) {
        try {
          const b = await api.sprints.getBurndown(activeSprint.id);
          setBurndownData(b as BurndownApiPayload);
        } catch {
          /* ignore */
        }
      }
      if (sprintTab === "health" && activeSprint) {
        try {
          const h = await api.sprints.getHealth(activeSprint.id);
          setHealthData(h);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      setStories(previous);
      toast.error(e instanceof ApiClientError ? e.message : "Failed to move story. Reverted.");
    }
  }

  function openStory(story: Story) {
    setSelectedStory(story);
    setSaveState("idle");
    setDrawerOpen(true);
  }

  async function updateStory(patch: Partial<Story>) {
    if (!selectedStory) return;
    setSaveState("saving");
    try {
      const updated = await api.stories.update(selectedStory.id, patch);
      setSelectedStory(updated);
      setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (sprintTab === "health" && activeSprint) {
        try {
          const h = await api.sprints.getHealth(activeSprint.id);
          setHealthData(h);
        } catch {
          /* ignore */
        }
      }
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1000);
    } catch (e) {
      setSaveState("error");
      toast.error(e instanceof ApiClientError ? e.message : "Failed to save story.");
      throw e;
    }
  }

  async function deleteStory() {
    if (!selectedStory) return;
    try {
      await api.stories.delete(selectedStory.id);
      toast.success("Story deleted.");
      setStories((prev) => prev.filter((s) => s.id !== selectedStory.id));
      setDrawerOpen(false);
      setSelectedStory(null);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to delete story.");
    }
  }

  if (!loading && !error && !activeSprint) {
    return (
      <EmptyState
        title="No active sprint"
        description="Kick off a sprint to start moving work across the board."
        action={
          <button
            type="button"
            onClick={() => navigate("/sprints")}
            className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
          >
            Create Sprint
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Active Sprint"
        subtitle="Move stories through your sprint workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            {activeSprint ? (
              <button
                type="button"
                onClick={() => setPokerOpen(true)}
                className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
              >
                Start Planning Poker
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowCompleteConfirm(true)}
              disabled={!activeSprint || completing}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-70"
            >
              Complete Sprint
            </button>
          </div>
        }
      />

      {loading ? <SprintBoardSkeleton /> : null}

      {!loading && error ? (
        <EmptyState
          title="Could not load active sprint"
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

      {!loading && !error && activeSprint ? (
        <>
          <Card padding="md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-3xl text-[var(--color-text-primary)]">{activeSprint.name}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{activeSprint.goal}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>{dateRangeText(activeSprint.startDate, activeSprint.endDate)}</span>
                  <span>-</span>
                  <span>{daysRemainingText(activeSprint.endDate)}</span>
                </div>
              </div>
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Burndown Progress</span>
                  <span>
                    {donePoints} / {totalPoints} pts
                  </span>
                </div>
                <SprintProgressBar
                  donePoints={donePoints}
                  totalPoints={totalPoints}
                  capacityTarget={capacityTarget}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setSprintTab("board")}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  sprintTab === "board"
                    ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-muted)]"
                }`}
              >
                Board
              </button>
              <button
                type="button"
                onClick={() => setSprintTab("burndown")}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  sprintTab === "burndown"
                    ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-muted)]"
                }`}
              >
                Burndown
              </button>
              <button
                type="button"
                onClick={() => setSprintTab("health")}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  sprintTab === "health"
                    ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-muted)]"
                }`}
              >
                Health
              </button>
            </div>
          </Card>

          {sprintTab === "board" ? (
            <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                {COLUMN_ORDER.map((column) => (
                  <KanbanColumn
                    key={column}
                    column={column}
                    stories={columnData[column]}
                    membersById={membersById}
                    onOpenStory={openStory}
                  />
                ))}
              </div>

              <DragOverlay>
                {dragStory ? (
                  <div className="w-[300px] opacity-90">
                    <StoryCardPreview
                      story={dragStory}
                      assignee={
                        dragStory.assigneeMemberId
                          ? membersById.get(dragStory.assigneeMemberId) ?? null
                          : null
                      }
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : sprintTab === "burndown" ? (
            <Card padding="md">
              {burndownLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Loading burndown…</p>
              ) : burndownData ? (
                <SprintBurndownChart data={burndownData} completed={false} showBanner />
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Could not load burndown.</p>
              )}
            </Card>
          ) : (
            <Card padding="md">
              <SprintHealthPanel data={healthData} loading={healthLoading} />
            </Card>
          )}
        </>
      ) : null}

      <StoryDetailDrawer
        open={drawerOpen}
        mode="edit"
        story={selectedStory}
        sprints={allSprints}
        activeMembers={teamMembers.filter((member) => member.isActive)}
        savingState={saveState}
        onClose={() => setDrawerOpen(false)}
        onCreate={async () => {}}
        onUpdate={updateStory}
        onDelete={deleteStory}
      />

      <ConfirmDialog
        open={showCompleteConfirm}
        title="Complete sprint?"
        description="This records sprint velocity from done stories and marks the sprint as completed."
        confirmLabel={completing ? "Completing..." : "Complete Sprint"}
        onCancel={() => !completing && setShowCompleteConfirm(false)}
        onConfirm={completeSprint}
      />

      <PlanningPokerModal
        open={pokerOpen}
        onClose={() => setPokerOpen(false)}
        sprintId={activeSprint?.id ?? null}
        onSessionCreated={(id) => navigate(`/poker/${id}`)}
      />
    </div>
  );
}

