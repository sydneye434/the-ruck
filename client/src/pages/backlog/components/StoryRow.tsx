// Developed by Sydney Edwards
import type { Story, TeamMember } from "@the-ruck/shared";
import { Avatar } from "../../../components/common/Avatar";
import { Badge } from "../../../components/common/Badge";

function statusLabel(column: Story["boardColumn"]) {
  if (column === "in_progress") return "In Progress";
  if (column === "in_review") return "In Review";
  if (column === "done") return "Done";
  return "Backlog";
}

function statusColor(column: Story["boardColumn"]) {
  if (column === "done") return "success" as const;
  if (column === "in_review") return "warning" as const;
  if (column === "in_progress") return "accent" as const;
  return "default" as const;
}

export function StoryRow({
  story,
  assignee,
  onClick
}: {
  story: Story;
  assignee: TeamMember | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-left hover:bg-[var(--color-bg-tertiary)]"
    >
      <Badge label={`${story.storyPoints} SP`} color="accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--color-text-primary)]">{story.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {story.labels.length === 0 ? (
            <span className="text-xs text-[var(--color-text-muted)]">No labels</span>
          ) : (
            story.labels.map((label) => <Badge key={label} label={label} color="default" />)
          )}
        </div>
      </div>

      <Badge label={statusLabel(story.boardColumn)} color={statusColor(story.boardColumn)} />

      {assignee ? (
        <Avatar name={assignee.name} color={assignee.avatar.color} size="sm" />
      ) : (
        <span className="w-20 text-right text-xs text-[var(--color-text-muted)]">Unassigned</span>
      )}
    </button>
  );
}

