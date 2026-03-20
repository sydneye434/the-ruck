// Developed by Sydney Edwards
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sprint, Story, TeamMember } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ConfirmDialog } from "../../components/dialog/ConfirmDialog";
import { useToast } from "../../components/feedback/ToastProvider";
import { StoryDetailDrawer, type SaveState, type StoryDraft } from "./components/StoryDetailDrawer";
import { StoryRow } from "./components/StoryRow";

type SprintFilter = "backlog" | string;

function sprintStatusLabel(sprint: Sprint) {
  if (sprint.status === "completed") return "Completed";
  const startDate = new Date(sprint.startDate).getTime();
  if (!Number.isNaN(startDate) && startDate > Date.now()) return "Planning";
  return "Active";
}

export function BacklogPage() {
  const toast = useToast();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<SprintFilter>("backlog");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("edit");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const savedTimerRef = useRef<number | null>(null);

  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const storyByDate = useMemo(
    () =>
      [...stories].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [stories]
  );

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  function markSaved() {
    setSaveState("saved");
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => setSaveState("idle"), 1300);
  }

  async function fetchBaseData() {
    const [sprintList, memberList] = await Promise.all([api.sprints.getAll(), api.teamMembers.getAll()]);
    setSprints(sprintList);
    setMembers(memberList);
  }

  async function fetchStoriesForFilter(filter: SprintFilter) {
    const storyList = await api.stories.getAll({ sprintId: filter });
    setStories(storyList);
  }

  async function loadPageData() {
    setLoading(true);
    setError(null);
    try {
      await fetchBaseData();
      await fetchStoriesForFilter(selectedFilter);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load backlog data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  async function onFilterChange(nextFilter: SprintFilter) {
    setSelectedFilter(nextFilter);
    setLoading(true);
    setError(null);
    try {
      await fetchStoriesForFilter(nextFilter);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load stories.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDrawer() {
    setSelectedStory(null);
    setDrawerMode("create");
    setSaveState("idle");
    setDrawerOpen(true);
  }

  function openEditDrawer(story: Story) {
    setSelectedStory(story);
    setDrawerMode("edit");
    setSaveState("idle");
    setDrawerOpen(true);
  }

  async function createStory(draft: StoryDraft) {
    try {
      const created = await api.stories.create({
        title: draft.title.trim(),
        storyPoints: draft.storyPoints!,
        sprintId: draft.sprintId,
        description: draft.description,
        assigneeMemberId: draft.assigneeMemberId,
        labels: draft.labels,
        acceptanceCriteria: draft.acceptanceCriteriaText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        boardColumn: draft.sprintId === "backlog" ? "backlog" : draft.boardColumn
      });
      toast.success("Story created.");
      setDrawerOpen(false);
      if (selectedFilter === draft.sprintId || (selectedFilter === "backlog" && created.boardColumn === "backlog")) {
        await fetchStoriesForFilter(selectedFilter);
      } else {
        await fetchStoriesForFilter(selectedFilter);
      }
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create story.");
      throw e;
    }
  }

  async function updateStory(patch: Partial<Story>) {
    if (!selectedStory) return;
    setSaveState("saving");
    try {
      const updated = await api.stories.update(selectedStory.id, patch);
      setSelectedStory(updated);
      setStories((prev) => prev.map((story) => (story.id === updated.id ? updated : story)));
      markSaved();
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
      setDeleteConfirmOpen(false);
      setDrawerOpen(false);
      setSelectedStory(null);
      await fetchStoriesForFilter(selectedFilter);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to delete story.");
    }
  }

  const assigneeMap = useMemo(() => {
    const map = new Map<string, TeamMember>();
    members.forEach((member) => map.set(member.id, member));
    return map;
  }, [members]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Backlog"
        subtitle="Refine upcoming work before it enters the active sprint."
        actions={
          <button
            type="button"
            onClick={openCreateDrawer}
            className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent-hover)]"
          >
            Create Story
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-3">
        <button
          type="button"
          onClick={() => onFilterChange("backlog")}
          className={[
            "inline-flex items-center gap-2 border px-3 py-1.5 text-sm",
            selectedFilter === "backlog"
              ? "border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
              : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
          ].join(" ")}
        >
          Backlog
          <Badge label="Unassigned" color="default" />
        </button>
        {sprints.map((sprint) => {
          const selected = selectedFilter === sprint.id;
          const status = sprintStatusLabel(sprint);
          return (
            <button
              key={sprint.id}
              type="button"
              onClick={() => onFilterChange(sprint.id)}
              className={[
                "inline-flex items-center gap-2 border px-3 py-1.5 text-sm",
                selected
                  ? "border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              ].join(" ")}
            >
              {sprint.name}
              <Badge
                label={status}
                color={status === "Completed" ? "success" : status === "Planning" ? "warning" : "accent"}
              />
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="animate-pulse">
                <div className="h-4 w-1/3 bg-[var(--color-bg-tertiary)]" />
                <div className="mt-2 h-3 w-1/2 bg-[var(--color-bg-tertiary)]" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <EmptyState
          title="Could not load stories"
          description={error}
          action={
            <button
              type="button"
              onClick={loadPageData}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!loading && !error && storyByDate.length === 0 ? (
        <EmptyState
          title="No stories yet"
          description="Create your first story to start shaping the backlog."
          action={
            <button
              type="button"
              onClick={openCreateDrawer}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent-hover)]"
            >
              Create Story
            </button>
          }
        />
      ) : null}

      {!loading && !error && storyByDate.length > 0 ? (
        <div className="space-y-2">
          {storyByDate.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              assignee={story.assigneeMemberId ? assigneeMap.get(story.assigneeMemberId) ?? null : null}
              onClick={() => openEditDrawer(story)}
            />
          ))}
        </div>
      ) : null}

      <StoryDetailDrawer
        open={drawerOpen}
        mode={drawerMode}
        story={selectedStory}
        sprints={sprints}
        activeMembers={activeMembers}
        savingState={saveState}
        onClose={() => setDrawerOpen(false)}
        onCreate={createStory}
        onUpdate={updateStory}
        onDelete={() => setDeleteConfirmOpen(true)}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete story?"
        description={`This will permanently remove "${selectedStory?.title ?? "this story"}".`}
        confirmLabel="Delete"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteStory}
      />
    </div>
  );
}

