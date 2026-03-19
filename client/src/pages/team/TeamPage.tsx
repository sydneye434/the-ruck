import { useEffect, useMemo, useState } from "react";
import type { TeamMember } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { useToast } from "../../components/feedback/ToastProvider";
import { ConfirmDialog } from "../../components/dialog/ConfirmDialog";
import { TeamMemberCard } from "./TeamMemberCard";
import { TeamMemberDrawer, type TeamMemberFormInput } from "./TeamMemberDrawer";

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
  const toast = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const inactiveMembers = useMemo(() => members.filter((m) => !m.isActive), [members]);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.teamMembers.getAll();
      setMembers(data);
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
          role: input.role,
          defaultAvailabilityDays: input.defaultAvailabilityDays,
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
          role: input.role,
          defaultAvailabilityDays: input.defaultAvailabilityDays,
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

  async function handleToggleActive(member: TeamMember) {
    try {
      await api.teamMembers.update(member.id, { active: !member.isActive });
      toast.success(member.isActive ? "Member deactivated." : "Member reactivated.");
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
        subtitle="Manage who is on the squad and their default sprint availability."
        actions={
          <button
            type="button"
            onClick={openCreateDrawer}
            className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent-hover)]"
          >
            Add Member
          </button>
        }
      />

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

      {!loading && !error && members.length === 0 ? (
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

      {!loading && !error && members.length > 0 ? (
        <>
          <section>
            <SectionHeader label="Active" count={activeMembers.length} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
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

      <TeamMemberDrawer
        open={drawerOpen}
        member={editingMember}
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

