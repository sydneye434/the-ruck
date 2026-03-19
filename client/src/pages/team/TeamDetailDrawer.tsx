import { useEffect, useMemo, useState } from "react";
import type { Team, TeamMember, TeamMemberLink, TeamWithDepth } from "@the-ruck/shared";
import { Spinner } from "../../components/feedback/Spinner";
import { TEAM_COLOR_VARIABLES } from "./teamPalette";

export function TeamDetailDrawer({
  open,
  team,
  teams,
  members,
  memberships,
  saving,
  onClose,
  onUpdateTeam,
  onAddMember,
  onRemoveMember
}: {
  open: boolean;
  team: Team | null;
  teams: TeamWithDepth[];
  members: TeamMember[];
  memberships: TeamMemberLink[];
  saving: boolean;
  onClose: () => void;
  onUpdateTeam: (patch: Partial<Team>) => Promise<void>;
  onAddMember: (memberId: string) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentTeamId, setParentTeamId] = useState<string>("");
  const [color, setColor] = useState<string>(TEAM_COLOR_VARIABLES[0]);
  const [memberPicker, setMemberPicker] = useState("");

  useEffect(() => {
    if (!open || !team) return;
    setName(team.name);
    setDescription(team.description ?? "");
    setParentTeamId(team.parentTeamId ?? "");
    setColor(team.color);
    setMemberPicker("");
  }, [open, team]);

  const assignedIds = useMemo(
    () =>
      new Set(
        memberships.filter((m) => m.teamId === team?.id).map((m) => m.memberId)
      ),
    [memberships, team?.id]
  );
  const assignedMembers = useMemo(
    () => members.filter((member) => assignedIds.has(member.id)),
    [assignedIds, members]
  );
  const availableMembers = useMemo(
    () => members.filter((member) => !assignedIds.has(member.id)),
    [assignedIds, members]
  );

  const chain = useMemo(() => {
    if (!team) return [];
    const byId = new Map(teams.map((t) => [t.id, t]));
    const list: TeamWithDepth[] = [];
    let cursor: TeamWithDepth | undefined = teams.find((t) => t.id === team.id);
    while (cursor) {
      list.unshift(cursor);
      cursor = cursor.parentTeamId ? byId.get(cursor.parentTeamId) : undefined;
    }
    return list;
  }, [team, teams]);

  const children = useMemo(
    () => teams.filter((t) => t.parentTeamId === team?.id),
    [team?.id, teams]
  );

  if (!team) return null;

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
          "absolute right-0 top-0 h-full w-full max-w-xl border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
      >
        <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-3">
          <h2 className="font-heading text-4xl text-[var(--color-text-primary)]">Team Detail</h2>
          <button type="button" onClick={onClose} className="border border-[var(--color-border)] px-2 py-1">
            Close
          </button>
        </div>

        <div className="mt-3 text-xs text-[var(--color-text-muted)]">
          {chain.map((node, i) => (
            <span key={node.id}>
              {node.name}
              {i < chain.length - 1 ? " -> " : ""}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== team.name && onUpdateTeam({ name: name.trim() })}
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
          />
          <textarea
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (team.description ?? "") && onUpdateTeam({ description })}
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
          />
          <select
            value={parentTeamId}
            onChange={async (e) => {
              const next = e.target.value;
              setParentTeamId(next);
              await onUpdateTeam({ parentTeamId: next || null });
            }}
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)]"
          >
            <option value="">No parent (root)</option>
            {teams
              .filter((t) => t.id !== team.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {"  ".repeat(t.depth)}
                  {t.depth > 0 ? "└ " : ""}
                  {t.name}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            {TEAM_COLOR_VARIABLES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={async () => {
                  setColor(swatch);
                  await onUpdateTeam({ color: swatch });
                }}
                className={[
                  "h-6 w-6 border",
                  color === swatch ? "border-[var(--color-text-primary)]" : "border-[var(--color-border)]"
                ].join(" ")}
                style={{ background: swatch }}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Members</h3>
          <div className="mt-2 flex gap-2">
            <select
              value={memberPicker}
              onChange={(e) => setMemberPicker(e.target.value)}
              className="flex-1 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-2 text-[var(--color-text-primary)]"
            >
              <option value="">Add member...</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                if (!memberPicker) return;
                await onAddMember(memberPicker);
                setMemberPicker("");
              }}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3"
            >
              Add
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {assignedMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between border border-[var(--color-border)] px-2 py-1">
                <span className="text-sm text-[var(--color-text-primary)]">{member.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveMember(member.id)}
                  className="text-xs text-[var(--color-danger)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Children Teams</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {children.length === 0 ? (
              <span className="text-xs text-[var(--color-text-muted)]">No child teams</span>
            ) : (
              children.map((child) => (
                <span
                  key={child.id}
                  className="inline-flex items-center gap-1 border border-[var(--color-border)] px-2 py-0.5 text-xs"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: child.color }} />
                  {child.name}
                </span>
              ))
            )}
          </div>
        </div>

        {saving ? (
          <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Spinner size="sm" /> Saving...
          </div>
        ) : null}
      </aside>
    </div>
  );
}

