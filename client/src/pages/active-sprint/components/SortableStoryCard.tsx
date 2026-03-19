import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { Story, TeamMember } from "@the-ruck/shared";
import { Badge } from "../../../components/common/Badge";
import { Avatar } from "../../../components/common/Avatar";

export function SortableStoryCard({
  story,
  assignee,
  onOpen
}: {
  story: Story;
  assignee: TeamMember | null;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: story.id
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "group border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 transition",
        "hover:border-[var(--color-accent)] hover:shadow-[0_0_0_1px_var(--color-accent)]",
        isDragging ? "opacity-45" : ""
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge label={`${story.storyPoints} pts`} color="accent" />
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab border border-transparent px-1 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag story"
        >
          ::
        </button>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-2 block w-full text-left"
      >
        <p
          className="line-clamp-2 font-semibold text-[var(--color-text-primary)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}
        >
          {story.title}
        </p>
      </button>

      <div className="mt-2 flex flex-wrap gap-1">
        {story.labels.slice(0, 3).map((label) => (
          <Badge key={label} label={label} color="default" />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge
          label={
            story.boardColumn === "in_progress"
              ? "In Progress"
              : story.boardColumn === "in_review"
                ? "In Review"
                : story.boardColumn === "done"
                  ? "Done"
                  : "Backlog"
          }
          color={
            story.boardColumn === "done"
              ? "success"
              : story.boardColumn === "in_review"
                ? "warning"
                : story.boardColumn === "in_progress"
                  ? "accent"
                  : "default"
          }
        />
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.avatar.color} size="sm" />
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">Unassigned</span>
        )}
      </div>
    </div>
  );
}

