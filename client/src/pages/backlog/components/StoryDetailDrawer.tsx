import { useEffect, useMemo, useState } from "react";
import type { Sprint, Story, StoryBoardColumn, StoryPoints, TeamMember } from "@the-ruck/shared";
import { Badge } from "../../../components/common/Badge";
import { Avatar } from "../../../components/common/Avatar";
import { Spinner } from "../../../components/feedback/Spinner";

type SaveState = "idle" | "saving" | "saved" | "error";

type StoryDraft = {
  title: string;
  description: string;
  storyPoints: StoryPoints | null;
  assigneeMemberId: string | null;
  labels: string[];
  boardColumn: StoryBoardColumn;
  acceptanceCriteriaText: string;
  sprintId: string;
};

function toAcceptanceCriteriaText(story: Story | null) {
  if (!story) return "";
  return story.acceptanceCriteria.join("\n");
}

function draftFromStory(story: Story | null): StoryDraft {
  if (!story) {
    return {
      title: "",
      description: "",
      storyPoints: null,
      assigneeMemberId: null,
      labels: [],
      boardColumn: "backlog",
      acceptanceCriteriaText: "",
      sprintId: "backlog"
    };
  }
  return {
    title: story.title,
    description: story.description,
    storyPoints: story.storyPoints,
    assigneeMemberId: story.assigneeMemberId,
    labels: [...story.labels],
    boardColumn: story.boardColumn,
    acceptanceCriteriaText: toAcceptanceCriteriaText(story),
    sprintId: story.sprintId
  };
}

function parseMarkdownBasic(input: string) {
  return input
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br/>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
}

const STORY_POINTS: StoryPoints[] = [1, 2, 3, 5, 8, 13];
const BOARD_COLUMNS: StoryBoardColumn[] = ["backlog", "in_progress", "in_review", "done"];

function humanColumn(column: StoryBoardColumn) {
  if (column === "in_progress") return "In Progress";
  if (column === "in_review") return "In Review";
  if (column === "done") return "Done";
  return "Backlog";
}

export function StoryDetailDrawer({
  open,
  mode,
  story,
  sprints,
  activeMembers,
  savingState,
  onClose,
  onCreate,
  onUpdate,
  onDelete
}: {
  open: boolean;
  mode: "create" | "edit";
  story: Story | null;
  sprints: Sprint[];
  activeMembers: TeamMember[];
  savingState: SaveState;
  onClose: () => void;
  onCreate: (draft: StoryDraft) => Promise<void>;
  onUpdate: (patch: Partial<Story>) => Promise<void>;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<StoryDraft>(() => draftFromStory(story));
  const [titleEditing, setTitleEditing] = useState(false);
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFromStory(story));
    setTitleEditing(mode === "create");
    setDescriptionPreview(false);
    setCreateError(null);
    setCreating(false);
    setLabelInput("");
    setAssigneeMenuOpen(false);
  }, [mode, open, story]);

  const saveLabel = useMemo(() => {
    if (mode === "create") return "Draft";
    if (savingState === "saving") return "Saving...";
    if (savingState === "saved") return "Saved";
    if (savingState === "error") return "Save failed";
    return "Idle";
  }, [mode, savingState]);

  async function autoSave(patch: Partial<Story>) {
    if (mode === "create") return;
    await onUpdate(patch);
  }

  async function handleTitleBlur() {
    setTitleEditing(false);
    if (mode === "edit" && story && draft.title.trim() !== story.title) {
      await autoSave({ title: draft.title.trim() || story.title });
    }
  }

  async function handleDescriptionBlur() {
    if (mode === "edit" && story && draft.description !== story.description) {
      await autoSave({ description: draft.description });
    }
  }

  async function handleAcceptanceBlur() {
    if (!story && mode !== "edit") return;
    const next = draft.acceptanceCriteriaText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (mode === "edit" && story && JSON.stringify(next) !== JSON.stringify(story.acceptanceCriteria)) {
      await autoSave({ acceptanceCriteria: next });
    }
  }

  async function addLabel(newLabel: string) {
    const clean = newLabel.trim();
    if (!clean) return;
    if (draft.labels.includes(clean)) return;
    const nextLabels = [...draft.labels, clean];
    setDraft((prev) => ({ ...prev, labels: nextLabels }));
    setLabelInput("");
    if (mode === "edit") await autoSave({ labels: nextLabels });
  }

  async function removeLabel(label: string) {
    const nextLabels = draft.labels.filter((l) => l !== label);
    setDraft((prev) => ({ ...prev, labels: nextLabels }));
    if (mode === "edit") await autoSave({ labels: nextLabels });
  }

  async function submitCreate() {
    setCreateError(null);
    if (!draft.title.trim()) {
      setCreateError("Title is required.");
      return;
    }
    if (!draft.storyPoints) {
      setCreateError("Story points are required.");
      return;
    }
    setCreating(true);
    try {
      await onCreate(draft);
    } catch (e: any) {
      setCreateError(e?.message ?? "Failed to create story.");
    } finally {
      setCreating(false);
    }
  }

  const selectedAssignee = useMemo(
    () => activeMembers.find((member) => member.id === draft.assigneeMemberId) ?? null,
    [activeMembers, draft.assigneeMemberId]
  );

  return (
    <div className={["fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none"].join(" ")}>
      <button
        type="button"
        onClick={onClose}
        className={["absolute inset-0 transition", open ? "opacity-100" : "opacity-0"].join(" ")}
        style={{ background: "color-mix(in srgb, var(--color-bg-primary) 72%, transparent)" }}
      />
      <aside
        className={[
          "absolute right-0 top-0 h-full w-full max-w-[560px] border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h2 className="font-heading text-4xl text-[var(--color-text-primary)]">
            {mode === "create" ? "Create Story" : "Story Detail"}
          </h2>
          <div className="flex items-center gap-2">
            <Badge label={saveLabel} color={savingState === "error" ? "danger" : "default"} />
            <button
              type="button"
              onClick={onClose}
              className="border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-text-secondary)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4 overflow-y-auto pb-24">
          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Title</label>
            {titleEditing ? (
              <input
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                onBlur={handleTitleBlur}
                autoFocus
                className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-2 text-lg font-semibold text-[var(--color-text-primary)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setTitleEditing(true)}
                className="mt-1 block w-full border border-transparent px-1 py-2 text-left text-lg font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
              >
                {draft.title || "Click to add title"}
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Description</label>
              <button
                type="button"
                onClick={() => setDescriptionPreview((v) => !v)}
                className="text-xs text-[var(--color-accent)]"
              >
                {descriptionPreview ? "Edit" : "Preview"}
              </button>
            </div>
            {descriptionPreview ? (
              <div
                className="mt-1 min-h-[120px] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm text-[var(--color-text-secondary)]"
                dangerouslySetInnerHTML={{ __html: parseMarkdownBasic(draft.description || "_No description_") }}
              />
            ) : (
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                onBlur={handleDescriptionBlur}
                rows={6}
                className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm text-[var(--color-text-primary)]"
              />
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Story Points</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {STORY_POINTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={async () => {
                    setDraft((p) => ({ ...p, storyPoints: value }));
                    await autoSave({ storyPoints: value });
                  }}
                  className={[
                    "border px-3 py-1 text-sm",
                    draft.storyPoints === value
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-text-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"
                  ].join(" ")}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Assignee</label>
            <button
              type="button"
              onClick={() => setAssigneeMenuOpen((v) => !v)}
              className="mt-1 flex w-full items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-2 text-left text-[var(--color-text-primary)]"
            >
              <span className="flex items-center gap-2">
                {selectedAssignee ? (
                  <>
                    <Avatar name={selectedAssignee.name} color={selectedAssignee.avatar.color} size="sm" />
                    <span>{selectedAssignee.name}</span>
                  </>
                ) : (
                  <span className="text-[var(--color-text-muted)]">Unassigned</span>
                )}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">▼</span>
            </button>
            {assigneeMenuOpen ? (
              <div className="absolute z-10 mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <button
                  type="button"
                  onClick={async () => {
                    setAssigneeMenuOpen(false);
                    setDraft((p) => ({ ...p, assigneeMemberId: null }));
                    await autoSave({ assigneeMemberId: null });
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                >
                  <span className="h-7 w-7 border border-[var(--color-border)] bg-[var(--color-bg-primary)]" />
                  Unassigned
                </button>
                {activeMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={async () => {
                      setAssigneeMenuOpen(false);
                      setDraft((p) => ({ ...p, assigneeMemberId: member.id }));
                      await autoSave({ assigneeMemberId: member.id });
                    }}
                    className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                  >
                    <Avatar name={member.name} color={member.avatar.color} size="sm" />
                    <span>{member.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Labels</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {draft.labels.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => removeLabel(label)}
                  className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
                >
                  {label} ×
                </button>
              ))}
            </div>
            <input
              value={labelInput}
              placeholder="Type label and press Enter"
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  void addLabel(labelInput);
                }
              }}
              onBlur={() => {
                if (labelInput.trim()) void addLabel(labelInput);
              }}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-2 text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Board Column</label>
            <select
              value={draft.boardColumn}
              onChange={async (e) => {
                const value = e.target.value as StoryBoardColumn;
                setDraft((p) => ({ ...p, boardColumn: value }));
                await autoSave({ boardColumn: value });
              }}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-2 text-[var(--color-text-primary)]"
            >
              {BOARD_COLUMNS.map((column) => (
                <option key={column} value={column}>
                  {humanColumn(column)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Acceptance Criteria</label>
            <textarea
              value={draft.acceptanceCriteriaText}
              onChange={(e) => setDraft((p) => ({ ...p, acceptanceCriteriaText: e.target.value }))}
              onBlur={handleAcceptanceBlur}
              rows={4}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Sprint Assignment</label>
            <select
              value={draft.sprintId}
              onChange={async (e) => {
                const value = e.target.value;
                setDraft((p) => ({
                  ...p,
                  sprintId: value,
                  ...(value === "backlog" ? { boardColumn: "backlog" as const } : {})
                }));
                if (mode === "edit") {
                  await autoSave({
                    sprintId: value,
                    ...(value === "backlog" ? { boardColumn: "backlog" as const } : {})
                  });
                }
              }}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-2 text-[var(--color-text-primary)]"
            >
              <option value="backlog">Backlog</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>

          {createError ? <p className="text-sm text-[var(--color-danger)]">{createError}</p> : null}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          {mode === "create" ? (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={submitCreate}
                className="inline-flex items-center gap-2 border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
              >
                {creating ? <Spinner size="sm" /> : null}
                Create Story
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-[var(--color-text-muted)]">
                <div>Created: {story?.createdAt ? new Date(story.createdAt).toLocaleString() : "n/a"}</div>
                <div>Updated: {story?.updatedAt ? new Date(story.updatedAt).toLocaleString() : "n/a"}</div>
              </div>
              <button
                type="button"
                onClick={onDelete}
                className="border border-[var(--color-danger)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-danger)]"
              >
                Delete Story
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export type { SaveState, StoryDraft };

