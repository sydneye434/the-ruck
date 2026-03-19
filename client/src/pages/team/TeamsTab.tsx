import { useMemo, useState } from "react";
import type { Team, TeamMember, TeamMemberLink, TeamTreeNode, TeamWithDepth } from "@the-ruck/shared";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { TEAM_COLOR_VARIABLES } from "./teamPalette";
import { TeamDetailDrawer } from "./TeamDetailDrawer";
import { buildTeamTree } from "../../lib/buildTeamTree";

function CreateTeamModal({
  open,
  teams,
  onClose,
  onCreate
}: {
  open: boolean;
  teams: TeamWithDepth[];
  onClose: () => void;
  onCreate: (input: { name: string; description: string; parentTeamId: string | null; color: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [parentTeamId, setParentTeamId] = useState("");
  const [color, setColor] = useState<string>(TEAM_COLOR_VARIABLES[0]);

  if (!open) return null;
  const filtered = teams.filter((team) => team.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "color-mix(in srgb, var(--color-bg-primary) 80%, transparent)" }}
    >
      <div className="w-full max-w-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
        <h2 className="font-heading text-4xl text-[var(--color-text-primary)]">Create Team</h2>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
          />
          <textarea
            value={description}
            maxLength={140}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parent team..."
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
          />
          <select
            value={parentTeamId}
            onChange={(e) => setParentTeamId(e.target.value)}
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
          >
            <option value="">No parent (root)</option>
            {filtered.map((team) => (
              <option key={team.id} value={team.id}>
                {"  ".repeat(team.depth)}
                {team.depth > 0 ? "└ " : ""}
                {team.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {TEAM_COLOR_VARIABLES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                className={[
                  "h-7 w-7 border",
                  color === swatch ? "border-[var(--color-text-primary)]" : "border-[var(--color-border)]"
                ].join(" ")}
                style={{ background: swatch }}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="border border-[var(--color-border)] px-3 py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!name.trim()) return;
              await onCreate({
                name: name.trim(),
                description: description.trim(),
                parentTeamId: parentTeamId || null,
                color
              });
              onClose();
            }}
            className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-[var(--color-text-primary)]"
          >
            Create Team
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeamsTab({
  teams,
  members,
  memberships,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onAddMember,
  onRemoveMember
}: {
  teams: TeamWithDepth[];
  members: TeamMember[];
  memberships: TeamMemberLink[];
  onCreateTeam: (input: { name: string; description: string; parentTeamId: string | null; color: string }) => Promise<void>;
  onUpdateTeam: (teamId: string, patch: Partial<Team>) => Promise<void>;
  onDeleteTeam: (teamId: string, mode: "single" | "cascade") => Promise<void>;
  onAddMember: (teamId: string, memberId: string) => Promise<void>;
  onRemoveMember: (teamId: string, memberId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tree = useMemo(() => buildTeamTree(teams), [teams]);
  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams]
  );
  const linksByTeam = useMemo(() => {
    const map = new Map<string, TeamMemberLink[]>();
    memberships.forEach((link) => {
      const list = map.get(link.teamId) ?? [];
      list.push(link);
      map.set(link.teamId, list);
    });
    return map;
  }, [memberships]);

  function renderNode(node: TeamTreeNode) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded[node.id] ?? true;
    const memberCount = linksByTeam.get(node.id)?.length ?? 0;
    return (
      <div key={node.id} className="space-y-1">
        <div
          className="flex items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2"
          style={{ marginLeft: `${node.depth * 18}px` }}
        >
          <button
            type="button"
            onClick={() => setSelectedTeamId(node.id)}
            className="flex items-center gap-2 text-left"
          >
            {hasChildren ? (
              <span
                className="inline-block w-4 text-[var(--color-text-muted)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((prev) => ({ ...prev, [node.id]: !isExpanded }));
                }}
              >
                {isExpanded ? "▾" : "▸"}
              </span>
            ) : (
              <span className="inline-block w-4 text-[var(--color-text-muted)]">•</span>
            )}
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: node.color }} />
            <span className="text-sm text-[var(--color-text-primary)]">{node.name}</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{memberCount} members</span>
            <span className="border border-[var(--color-border)] px-1 py-0.5">Level {node.depth}</span>
            <button
              type="button"
              onClick={async () => {
                const mode = window.confirm("Delete team and all descendants? OK = cascade, Cancel = single")
                  ? "cascade"
                  : "single";
                await onDeleteTeam(node.id, mode);
              }}
              className="text-[var(--color-danger)]"
            >
              Delete
            </button>
          </div>
        </div>
        {hasChildren && isExpanded ? node.children.map((child) => renderNode(child)) : null}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <EmptyState
        title="No teams yet"
        description="Create a root team to start building your hierarchy."
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
          >
            Create Team
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
        >
          Create Team
        </button>
      </div>

      <Card padding="md">{tree.map((node) => renderNode(node))}</Card>

      <CreateTeamModal
        open={createOpen}
        teams={teams}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateTeam}
      />

      <TeamDetailDrawer
        open={Boolean(selectedTeam)}
        team={selectedTeam}
        teams={teams}
        members={members}
        memberships={memberships}
        saving={saving}
        onClose={() => setSelectedTeamId(null)}
        onUpdateTeam={async (patch) => {
          if (!selectedTeam) return;
          setSaving(true);
          try {
            await onUpdateTeam(selectedTeam.id, patch);
          } finally {
            setSaving(false);
          }
        }}
        onAddMember={async (memberId) => {
          if (!selectedTeam) return;
          await onAddMember(selectedTeam.id, memberId);
        }}
        onRemoveMember={async (memberId) => {
          if (!selectedTeam) return;
          await onRemoveMember(selectedTeam.id, memberId);
        }}
      />
    </div>
  );
}

