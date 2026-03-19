import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Team, TeamMember, TeamMemberLink, TeamWithDepth } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { useToast } from "../../components/feedback/ToastProvider";
import { ConfirmDialog } from "../../components/dialog/ConfirmDialog";
import { TeamMemberCard } from "./TeamMemberCard";
import { TeamMemberDrawer, type TeamMemberFormInput } from "./TeamMemberDrawer";
import { TeamsTab } from "./TeamsTab";

function TeamSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} padding="md">
          <div className="animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-[var(--color-bg-tertiary)]" />
                <div>
                  <div className="h-4 w-32 bg-[var(--color-bg-tertiary)]" />
                  <div className="mt-2 h-3 w-24 bg-[var(--color-bg-tertiary)]" />
                </div>
              </div>
              <div className="h-8 w-8 bg-[var(--color-bg-tertiary)]" />
            </div>
            <div className="mt-5 h-3 w-36 bg-[var(--color-bg-tertiary)]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-3 border-b border-[var(--color-border)] pb-1">
      <h2 className="font-heading text-2xl text-[var(--color-text-primary)]">
        {label} ({count})
      </h2>
    </div>
  );
}

export function TeamPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<TeamWithDepth[]>([]);
  const [memberships, setMemberships] = useState<TeamMemberLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"members" | "teams">("members");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const inactiveMembers = useMemo(() => members.filter((m) => !m.isActive), [members]);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const memberTeamBadges = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; color: string }>>();
    memberships.forEach((link) => {
      const team = teamsById.get(link.teamId);
      if (!team) return;
      const list = map.get(link.memberId) ?? [];
      list.push({ id: team.id, name: team.name, color: team.color });
      map.set(link.memberId, list);
    });
    return map;
  }, [memberships, teamsById]);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      const [memberData, teamData, links] = await Promise.all([
        api.teamMembers.getAll(),
        api.teams.getAll(),
        api.teams.getMemberships()
      ]);
      setMembers(memberData);
      setTeams(teamData);
      setMemberships(links);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : "Failed to load team members.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function openCreateDrawer() {
    setEditingMember(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(member: TeamMember) {
    setEditingMember(member);
    setDrawerOpen(true);
  }

  async function handleSubmitMember(input: TeamMemberFormInput) {
    setSubmitting(true);
    try {
      if (editingMember) {
        await api.teamMembers.update(editingMember.id, {
          name: input.name,
          roleType: input.roleType,
          coordinatorTitle: input.coordinatorTitle || undefined,
          defaultAvailabilityDays: input.defaultAvailabilityDays,
          capacityMultiplier: input.capacityMultiplier,
          coordinatorTeamIds: input.coordinatorTeamIds,
          avatar: {
            color: input.avatarColor,
            initials: input.name
              .split(" ")
              .map((x) => x[0] ?? "")
              .join("")
              .slice(0, 2)
              .toUpperCase()
          }
        });
        toast.success("Member updated.");
      } else {
        await api.teamMembers.create({
          name: input.name,
          roleType: input.roleType,
          coordinatorTitle: input.coordinatorTitle || undefined,
          defaultAvailabilityDays: input.defaultAvailabilityDays,
          capacityMultiplier: input.capacityMultiplier,
          coordinatorTeamIds: input.coordinatorTeamIds,
          isActive: true,
          avatar: {
            color: input.avatarColor,
            initials: input.name
              .split(" ")
              .map((x) => x[0] ?? "")
              .join("")
              .slice(0, 2)
              .toUpperCase()
          }
        });
        toast.success("Member added to lineup.");
      }
      setDrawerOpen(false);
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to save member.");
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  async function createTeam(input: { name: string; description: string; parentTeamId: string | null; color: string }) {
    try {
      await api.teams.create(input);
      toast.success("Team created.");
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create team.");
      throw e;
    }
  }

  async function updateTeam(teamId: string, patch: Partial<Team>) {
    try {
      await api.teams.update(teamId, patch);
      toast.success("Team updated.");
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to update team.");
      throw e;
    }
  }

  async function deleteTeam(teamId: string, mode: "single" | "cascade") {
    try {
      await api.teams.delete(teamId, mode);
      toast.success("Team deleted.");
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to delete team.");
    }
  }

  async function addTeamMember(teamId: string, memberId: string) {
    try {
      await api.teams.addMember(teamId, memberId);
      toast.success("Member added to team.");
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to add member.");
      throw e;
    }
  }

  async function removeTeamMember(teamId: string, memberId: string) {
    try {
      await api.teams.removeMember(teamId, memberId);
      toast.success("Member removed from team.");
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to remove member.");
      throw e;
    }
  }

  async function handleToggleActive(member: TeamMember) {
    try {
      if (member.isActive) {
        await api.teamMembers.deactivate(member.id);
        toast.success("Member deactivated.");
      } else {
        await api.teamMembers.reactivate(member.id);
        toast.success("Member reactivated.");
      }
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to update member status.");
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.teamMembers.delete(deleteTarget.id);
      toast.success("Member deleted.");
      setDeleteTarget(null);
      await loadMembers();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to delete member.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team Lineup"
        subtitle="Manage who is on the squad, team hierarchy, and effective capacity."
        actions={
          <div className="flex items-center gap-2">
            {tab === "members" ? (
              <button
                type="button"
                onClick={openCreateDrawer}
                className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent-hover)]"
              >
                Add Member
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate("/team/org-chart")}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              Org Chart
            </button>
          </div>
        }
      />

      <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
        {(["members", "teams"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              "border px-3 py-1.5 text-sm",
              tab === key
                ? "border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
            ].join(" ")}
          >
            {key === "members" ? "Members" : "Teams"}
          </button>
        ))}
      </div>

      {loading ? <TeamSkeletonGrid /> : null}

      {!loading && error ? (
        <EmptyState
          title="Could not load team members"
          description={error}
          action={
            <button
              type="button"
              onClick={loadMembers}
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!loading && !error && members.length === 0 && tab === "members" ? (
        <EmptyState
          title="No team members yet"
          description="Add your first teammate to start building a sprint lineup and unlock planning inputs."
          action={
            <button
              type="button"
              onClick={openCreateDrawer}
              className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent-hover)]"
            >
              Add your first member
            </button>
          }
        />
      ) : null}

      {!loading && !error && tab === "members" && members.length > 0 ? (
        <>
          <section>
            <SectionHeader label="Active" count={activeMembers.length} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  teamBadges={memberTeamBadges.get(member.id) ?? []}
                  onEdit={openEditDrawer}
                  onToggleActive={handleToggleActive}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </section>

          <section className="pt-2">
            <SectionHeader label="Inactive" count={inactiveMembers.length} />
            {inactiveMembers.length === 0 ? (
              <Card padding="md">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No inactive members right now.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {inactiveMembers.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    teamBadges={memberTeamBadges.get(member.id) ?? []}
                    onEdit={openEditDrawer}
                    onToggleActive={handleToggleActive}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {!loading && !error && tab === "teams" ? (
        <TeamsTab
          teams={teams}
          members={members}
          memberships={memberships}
          onCreateTeam={createTeam}
          onUpdateTeam={updateTeam}
          onDeleteTeam={deleteTeam}
          onAddMember={addTeamMember}
          onRemoveMember={removeTeamMember}
        />
      ) : null}

      <TeamMemberDrawer
        open={drawerOpen}
        member={editingMember}
        teams={teams}
        submitting={submitting}
        onClose={() => {
          if (submitting) return;
          setDrawerOpen(false);
        }}
        onSubmit={handleSubmitMember}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove team member?"
        description={`This will permanently delete ${deleteTarget?.name ?? "this member"} from The Ruck.`}
        confirmLabel={deleting ? "Deleting..." : "Delete member"}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}

