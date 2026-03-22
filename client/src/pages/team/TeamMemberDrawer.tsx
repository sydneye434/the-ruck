// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import type { TeamMember, TeamWithDepth } from "@the-ruck/shared";
import { Spinner } from "../../components/feedback/Spinner";
import { AVATAR_COLOR_VARIABLES, pickAvatarColor } from "../../lib/avatarPalette";

type TeamMemberFormInput = {
  name: string;
  roleType: TeamMember["roleType"];
  coordinatorTitle: string;
  defaultAvailabilityDays: number;
  capacityMultiplier: number;
  customCapacityMode: boolean;
  avatarColor: string;
  coordinatorTeamIds: string[];
};

type FieldErrors = Partial<Record<keyof TeamMemberFormInput, string>>;

function deriveInitialState(member: TeamMember | null): TeamMemberFormInput {
  if (!member) {
    return {
      name: "",
      roleType: "team_member",
      coordinatorTitle: "",
      defaultAvailabilityDays: 8,
      capacityMultiplier: 100,
      customCapacityMode: false,
      avatarColor: pickAvatarColor(String(Date.now()))
      ,
      coordinatorTeamIds: []
    };
  }
  return {
    name: member.name,
    roleType: member.roleType,
    coordinatorTitle: member.coordinatorTitle ?? "",
    defaultAvailabilityDays: member.defaultAvailabilityDays,
    capacityMultiplier: member.capacityMultiplier ?? 100,
    customCapacityMode:
      ![25, 50, 75, 100].includes(member.capacityMultiplier ?? 100),
    avatarColor: member.avatar.color,
    coordinatorTeamIds: member.coordinatorTeamIds ?? []
  };
}

function validate(input: TeamMemberFormInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) errors.name = "Name is required.";
  if (input.name.trim().length > 60) errors.name = "Name must be 60 characters or fewer.";
  if (!Number.isFinite(input.defaultAvailabilityDays)) {
    errors.defaultAvailabilityDays = "Availability must be a number.";
  } else if (input.defaultAvailabilityDays < 1 || input.defaultAvailabilityDays > 20) {
    errors.defaultAvailabilityDays = "Availability must be between 1 and 20 days.";
  }
  if (input.roleType === "coordinator" && !input.coordinatorTitle.trim()) {
    errors.coordinatorTitle = "Coordinator title is required.";
  }
  if (
    !Number.isFinite(input.capacityMultiplier) ||
    input.capacityMultiplier < 1 ||
    input.capacityMultiplier > 100
  ) {
    errors.capacityMultiplier = "Capacity must be between 1 and 100.";
  }
  return errors;
}

export function TeamMemberDrawer({
  open,
  member,
  teams = [],
  submitting,
  onClose,
  onSubmit
}: {
  open: boolean;
  member: TeamMember | null;
  teams?: TeamWithDepth[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: TeamMemberFormInput) => Promise<void>;
}) {
  const [form, setForm] = useState<TeamMemberFormInput>(() => deriveInitialState(member));
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setForm(deriveInitialState(member));
    setErrors({});
  }, [member, open]);

  const title = useMemo(() => (member ? "Edit Member" : "Add Member"), [member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({
      ...form,
      name: form.name.trim(),
      coordinatorTitle:
        form.roleType === "coordinator" ? form.coordinatorTitle.trim() : ""
    });
  }

  return (
    <div className={["fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none"].join(" ")}>
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className={[
          "absolute inset-0 transition",
          open ? "opacity-100" : "opacity-0"
        ].join(" ")}
        style={{ background: "color-mix(in srgb, var(--color-bg-primary) 72%, transparent)" }}
      />
      <aside
        className={[
          "absolute right-0 top-0 h-full w-full max-w-xl border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-heading text-4xl leading-none text-[var(--color-text-primary)]">{title}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Capture who is in the lineup and their default sprint availability.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]" htmlFor="member-name">
              Full name
            </label>
            <input
              id="member-name"
              value={form.name}
              maxLength={60}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            />
            {errors.name ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.name}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]" htmlFor="member-role">
              Role
            </label>
            <select
              id="member-role"
              value={form.roleType}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, roleType: e.target.value as TeamMember["roleType"] }))
              }
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="team_member">Team Member</option>
              <option value="scrum_master">Scrum Master</option>
              <option value="product_owner">Product Owner</option>
              <option value="coordinator">Coordinator</option>
            </select>
          </div>

          {form.roleType === "coordinator" ? (
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)]" htmlFor="member-coordinator-title">
                Coordinator Title
              </label>
              <input
                id="member-coordinator-title"
                value={form.coordinatorTitle}
                maxLength={60}
                onChange={(e) => setForm((prev) => ({ ...prev, coordinatorTitle: e.target.value }))}
                placeholder="e.g. SoSM, SoSoSM, RTE, Chief Product Owner"
                className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              />
              {errors.coordinatorTitle ? (
                <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.coordinatorTitle}</p>
              ) : null}

              <p className="mt-2 text-xs text-[var(--color-text-muted)]">Coordinated teams</p>
              <div className="mt-1 max-h-28 space-y-1 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
                {teams.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">No teams available yet.</p>
                ) : (
                  teams.map((team) => {
                    const checked = form.coordinatorTeamIds.includes(team.id);
                    return (
                      <label key={team.id} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              coordinatorTeamIds: e.target.checked
                                ? [...prev.coordinatorTeamIds, team.id]
                                : prev.coordinatorTeamIds.filter((id) => id !== team.id)
                            }))
                          }
                        />
                        <span style={{ marginLeft: team.depth * 8 }}>
                          {team.depth > 0 ? "└ " : ""}
                          {team.name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]" htmlFor="member-capacity">
              Capacity %
            </label>
            <select
              id="member-capacity"
              value={form.customCapacityMode ? "custom" : String(form.capacityMultiplier)}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setForm((prev) => ({ ...prev, customCapacityMode: true }));
                } else {
                  setForm((prev) => ({
                    ...prev,
                    customCapacityMode: false,
                    capacityMultiplier: Number(e.target.value)
                  }));
                }
              }}
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="100">100%</option>
              <option value="75">75%</option>
              <option value="50">50%</option>
              <option value="25">25%</option>
              <option value="custom">Custom</option>
            </select>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              For part-time or shared engineers. 100% = fully dedicated.
            </p>
            {form.customCapacityMode ? (
              <input
                type="number"
                min={1}
                max={100}
                value={form.capacityMultiplier}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, capacityMultiplier: Number(e.target.value) }))
                }
                className="mt-2 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              />
            ) : null}
            {errors.capacityMultiplier ? (
              <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.capacityMultiplier}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]" htmlFor="member-availability">
              Default availability (days / sprint)
            </label>
            <input
              id="member-availability"
              type="number"
              min={1}
              max={20}
              value={form.defaultAvailabilityDays}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  defaultAvailabilityDays: Number(e.target.value)
                }))
              }
              className="mt-1 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Used by capacity planning to estimate sprint commitment for this person.
            </p>
            {errors.defaultAvailabilityDays ? (
              <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.defaultAvailabilityDays}</p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Avatar color</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATAR_COLOR_VARIABLES.map((color) => {
                const selected = form.avatarColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, avatarColor: color }))}
                    className={[
                      "h-8 w-8 border-2 transition",
                      selected ? "border-[var(--color-text-primary)]" : "border-[var(--color-border)]"
                    ].join(" ")}
                    style={{ background: color }}
                    aria-label={`Choose avatar color ${color}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-70"
            >
              {submitting ? <Spinner size="sm" /> : null}
              {member ? "Save changes" : "Add member"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export type { TeamMemberFormInput };

