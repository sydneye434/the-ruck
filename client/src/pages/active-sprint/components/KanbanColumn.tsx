// Developed by Sydney Edwards
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Story, StoryBoardColumn, TeamMember } from "@the-ruck/shared";
import { Badge } from "../../../components/common/Badge";
import { SortableStoryCard } from "./SortableStoryCard";

function columnTitle(column: StoryBoardColumn) {
  if (column === "in_progress") return "In Progress";
  if (column === "in_review") return "In Review";
  if (column === "done") return "Done";
  return "Backlog";
}

export function KanbanColumn({
  column,
  stories,
  membersById,
  onOpenStory
}: {
  column: StoryBoardColumn;
  stories: Story[];
  membersById: Map<string, TeamMember>;
  onOpenStory: (story: Story) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: column
  });

  const totalPoints = stories.reduce((sum, story) => sum + (story.storyPoints ?? 0), 0);

  return (
    <section
      ref={setNodeRef}
      className={[
        "flex min-h-[420px] flex-col border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 transition",
        isOver ? "border-[var(--color-accent)] bg-[var(--color-bg-tertiary)]" : ""
      ].join(" ")}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">{columnTitle(column)}</h3>
        <div className="flex items-center gap-1">
          <Badge label={`${stories.length}`} color="default" />
          <Badge label={`${totalPoints} pts`} color="accent" />
        </div>
      </header>

      <SortableContext items={stories.map((story) => story.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {stories.map((story) => (
            <SortableStoryCard
              key={story.id}
              story={story}
              assignee={story.assigneeMemberId ? membersById.get(story.assigneeMemberId) ?? null : null}
              onOpen={() => onOpenStory(story)}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

