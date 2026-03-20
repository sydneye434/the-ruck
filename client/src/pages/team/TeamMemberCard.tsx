// Developed by Sydney Edwards
import { useEffect, useRef, useState } from "react";
import type { TeamMember } from "@the-ruck/shared";
import { Avatar } from "../../components/common/Avatar";
import { Badge } from "../../components/common/Badge";
import { Card } from "../../components/common/Card";

export function TeamMemberCard({
  member,
  teamBadges,
  onEdit,
  onToggleActive,
  onDelete
}: {
  member: TeamMember;
  teamBadges: Array<{ id: string; name: string; color: string }>;
  onEdit: (member: TeamMember) => void;
  onToggleActive: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      window.addEventListener("mousedown", onClickOutside);
    }
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <Card padding="md" className="relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} color={member.avatar.color} size="lg" />
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">{member.name}</h3>
            <div className="mt-1">
              {member.roleType === "coordinator" ? (
                <Badge label={member.coordinatorTitle || "Coordinator"} color="coordinator" />
              ) : member.roleType === "scrum_master" ? (
                <Badge label="Scrum Master" color="accent" />
              ) : member.roleType === "product_owner" ? (
                <Badge label="Product Owner" color="product" />
              ) : (
                <Badge label="Team Member" color="default" />
              )}
            </div>
          </div>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-8 w-8 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
            aria-label="Open member actions"
          >
            ...
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-9 z-10 w-40 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(member);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleActive(member);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                {member.isActive ? "Deactivate" : "Reactivate"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(member);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-bg-tertiary)]"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {member.defaultAvailabilityDays} days / sprint
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {member.defaultAvailabilityDays} days × {member.capacityMultiplier ?? 100}% ={" "}
            {Math.round((member.defaultAvailabilityDays * (member.capacityMultiplier ?? 100)) / 100)} effective days
          </p>
        </div>
        <Badge label={member.isActive ? "Active" : "Inactive"} color={member.isActive ? "success" : "warning"} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {(member.capacityMultiplier ?? 100) < 100 ? (
          <Badge label={`${member.capacityMultiplier}% capacity`} color="warning" />
        ) : null}
        {teamBadges.length === 0 ? (
          <span className="text-xs text-[var(--color-text-muted)]">No team</span>
        ) : (
          teamBadges.map((team) => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1 border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: team.color }} />
              {team.name}
            </span>
          ))
        )}
      </div>
    </Card>
  );
}

