// Developed by Sydney Edwards
import type { Story, TeamMember } from "@the-ruck/shared";
import { Badge } from "../../../components/common/Badge";
import { Avatar } from "../../../components/common/Avatar";

export function StoryCardPreview({
  story,
  assignee
}: {
  story: Story;
  assignee: TeamMember | null;
}) {
  return (
    <div className="border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] p-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <Badge label={story.storyPoints == null ? "— pts" : `${story.storyPoints} pts`} color="accent" />
        <span className="px-1 text-[var(--color-text-muted)]">::</span>
      </div>

      <p
        className="mt-2 line-clamp-2 font-semibold text-[var(--color-text-primary)]"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}
      >
        {story.title}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {story.labels.slice(0, 3).map((label) => (
          <Badge key={label} label={label} color="default" />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end">
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.avatar.color} size="sm" />
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">Unassigned</span>
        )}
      </div>
    </div>
  );
}

