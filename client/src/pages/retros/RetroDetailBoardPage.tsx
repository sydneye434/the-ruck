// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Retro, RetroActionItem, RetroCard, Sprint, TeamMember } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { Avatar } from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/dialog/ConfirmDialog";
import { useToast } from "../../components/feedback/ToastProvider";

const CURRENT_MEMBER_KEY = "the-ruck.retro.currentMemberId";
const PHASES: Retro["phase"][] = ["reflect", "discuss", "action_items", "closed"];

function phaseLabel(phase: Retro["phase"]) {
  if (phase === "action_items") return "Action Items";
  if (phase === "closed") return "Closed";
  return phase[0].toUpperCase() + phase.slice(1);
}

export function RetroDetailBoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retro, setRetro] = useState<Retro | null>(null);
  const [columns, setColumns] = useState<Array<{ key: string; label: string; color: string }>>([]);
  const [cards, setCards] = useState<RetroCard[]>([]);
  const [actionItems, setActionItems] = useState<RetroActionItem[]>([]);
  const [carriedOverItems, setCarriedOverItems] = useState<RetroActionItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState("");
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [actionFormOpen, setActionFormOpen] = useState(false);
  const [editActionId, setEditActionId] = useState<string | null>(null);
  const [actionDescription, setActionDescription] = useState("");
  const [actionOwnerId, setActionOwnerId] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [carriedExpanded, setCarriedExpanded] = useState(false);

  const sprintById = useMemo(() => new Map(sprints.map((s) => [s.id, s])), [sprints]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const sprint = retro ? sprintById.get(retro.sprintId) ?? null : null;
  const phaseIndex = retro ? PHASES.indexOf(retro.phase) : -1;
  const nextPhase = phaseIndex >= 0 && phaseIndex < 2 ? PHASES[phaseIndex + 1] : null;
  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);

  const closeSummary = useMemo(() => {
    const openAfter = actionItems.filter((i) => i.status !== "complete").length;
    return {
      cards: cards.length,
      actionItems: actionItems.length,
      carried: actionItems.filter((i) => i.carriedOverFromId).length,
      openAfter
    };
  }, [cards, actionItems]);

  async function loadBoard() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [board, sprintsData, membersData] = await Promise.all([
        api.retros.getById(id),
        api.sprints.getAll(),
        api.teamMembers.getAll()
      ]);
      setRetro(board.retro);
      setColumns(board.columns);
      setCards(board.cards);
      setActionItems(board.actionItems);
      setCarriedOverItems(board.carriedOverItems);
      setCarriedExpanded(board.carriedOverItems.length > 0);
      setSprints(sprintsData);
      setMembers(membersData);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load retro board.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, [id]);

  useEffect(() => {
    if (!activeMembers.length) return;
    const stored = localStorage.getItem(CURRENT_MEMBER_KEY);
    setCurrentMemberId(stored && activeMembers.some((m) => m.id === stored) ? stored : activeMembers[0].id);
  }, [activeMembers]);

  useEffect(() => {
    if (currentMemberId) localStorage.setItem(CURRENT_MEMBER_KEY, currentMemberId);
  }, [currentMemberId]);

  useEffect(() => {
    const tick = async () => {
      if (!id || document.visibilityState !== "visible") return;
      try {
        const latest = await api.retros.cards.getAll(id);
        setCards(latest);
      } catch {
        // no-op
      }
    };
    const timer = window.setInterval(tick, 30000);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id]);

  async function toggleAnonymous() {
    if (!retro) return;
    const prev = retro.isAnonymous;
    setRetro({ ...retro, isAnonymous: !prev });
    try {
      const updated = await api.retros.update(retro.id, { isAnonymous: !prev });
      setRetro(updated);
    } catch (e) {
      setRetro({ ...retro, isAnonymous: prev });
      toast.error(e instanceof ApiClientError ? e.message : "Failed to toggle anonymous mode.");
    }
  }

  async function advancePhase() {
    if (!retro || !nextPhase) return;
    try {
      const updated = await api.retros.update(retro.id, { phase: nextPhase });
      setRetro(updated);
      setConfirmAdvance(false);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to advance phase.");
    }
  }

  async function closeRetro() {
    if (!retro) return;
    try {
      await api.retros.update(retro.id, { phase: "closed" });
      toast.success("Retrospective closed");
      navigate("/retros");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to close retrospective.");
    }
  }

  async function cycleStatus(item: RetroActionItem) {
    if (!id) return;
    const next = item.status === "open" ? "in_progress" : item.status === "in_progress" ? "complete" : "open";
    const prev = item.status;
    setActionItems((list) => list.map((x) => (x.id === item.id ? { ...x, status: next } : x)));
    setCarriedOverItems((list) => list.map((x) => (x.id === item.id ? { ...x, status: next } : x)));
    try {
      await api.retros.actionItems.update(id, item.id, { status: next });
    } catch {
      setActionItems((list) => list.map((x) => (x.id === item.id ? { ...x, status: prev } : x)));
      setCarriedOverItems((list) => list.map((x) => (x.id === item.id ? { ...x, status: prev } : x)));
      toast.error("Failed to update status.");
    }
  }

  async function saveAction() {
    if (!id || !actionDescription.trim()) {
      setActionError("Description is required.");
      return;
    }
    try {
      if (editActionId) {
        const updated = await api.retros.actionItems.update(id, editActionId, {
          description: actionDescription.trim(),
          ownerId: actionOwnerId || null,
          dueDate: actionDueDate ? new Date(actionDueDate).toISOString() : null
        });
        setActionItems((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await api.retros.actionItems.create(id, {
          description: actionDescription.trim(),
          ownerId: actionOwnerId || null,
          dueDate: actionDueDate ? new Date(actionDueDate).toISOString() : null,
          status: "open"
        });
        setActionItems((list) => [created, ...list]);
      }
      setActionFormOpen(false);
      setEditActionId(null);
      setActionDescription("");
      setActionOwnerId("");
      setActionDueDate("");
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof ApiClientError ? e.message : "Failed to save action item.");
    }
  }

  async function addCarried(item: RetroActionItem) {
    if (!id) return;
    try {
      const created = await api.retros.actionItems.create(id, {
        description: item.description,
        ownerId: item.ownerId,
        dueDate: item.dueDate ?? null,
        status: "open",
        carriedOverFromId: item.id
      });
      setActionItems((list) => [created, ...list]);
      toast.success("Added to this retro.");
    } catch {
      toast.error("Failed to add carried item.");
    }
  }

  if (loading) return <div className="h-24 animate-pulse border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />;
  if (error || !retro) return <EmptyState title="Could not load retro" description={error ?? "Not found"} />;

  const readOnlyNotes = retro.phase === "action_items" || retro.phase === "closed";

  return (
    <div className="space-y-4">
      <PageHeader
        title={retro.title}
        subtitle={`${sprint?.name ?? "Unknown Sprint"}${sprint ? ` · ${new Date(sprint.startDate).toLocaleDateString()} - ${new Date(sprint.endDate).toLocaleDateString()}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge label={retro.template} color="default" />
            <button type="button" onClick={toggleAnonymous} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-primary)]">
              {retro.isAnonymous ? "Anonymous: ON" : "Anonymous: OFF"}
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2">
        <div className="flex items-center gap-2">
          {PHASES.slice(0, 3).map((p, idx) => (
            <span key={p} className={idx <= Math.min(phaseIndex, 2) ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}>
              {phaseLabel(p)}{idx < 2 ? " -> " : ""}
            </span>
          ))}
          {retro.phase === "closed" ? <Badge label="Closed" color="default" /> : null}
        </div>
        {retro.phase === "action_items" ? (
          <button type="button" onClick={() => setConfirmClose(true)} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)]">Close Retro</button>
        ) : nextPhase ? (
          <button type="button" onClick={() => setConfirmAdvance(true)} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)]">Advance Phase</button>
        ) : null}
      </div>

      {retro.phase === "action_items" ? (
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-text-secondary)]">
          Action items phase - capture what the team will do differently next sprint
        </div>
      ) : null}

      {readOnlyNotes ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[60%_40%]">
          <section>
            <div className="mb-2 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">Sprint Notes (Read Only)</div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[860px] gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                {columns.map((col) => (
                  <div key={col.key} className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <div className="border-b border-[var(--color-border)] p-2 text-sm font-semibold text-[var(--color-text-primary)]">{col.label}</div>
                    <div className="space-y-2 p-2">
                      {cards.filter((c) => c.columnKey === col.key).map((card) => (
                        <div key={card.id} className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
                          <p className="text-sm text-[var(--color-text-primary)]">{card.content}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                            <Badge label={`${card.upvotes.length} upvotes`} color="default" />
                            <span>{retro.isAnonymous ? "Anonymous" : (memberById.get(card.authorId)?.name ?? "Unknown")}</span>
                            {card.groupId ? <span>Group</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-3xl text-[var(--color-text-primary)]">Action Items</h3>
              {retro.phase === "action_items" ? <button type="button" onClick={() => { setActionFormOpen(true); setEditActionId(null); setActionDescription(""); setActionOwnerId(""); setActionDueDate(""); }} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)]">Add Action Item</button> : null}
            </div>

            {actionFormOpen && retro.phase === "action_items" ? (
              <div className="mb-3 border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
                <textarea rows={3} maxLength={280} value={actionDescription} onChange={(e) => setActionDescription(e.target.value)} className="w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-text-primary)]" />
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <select value={actionOwnerId} onChange={(e) => setActionOwnerId(e.target.value)} className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm text-[var(--color-text-primary)]">
                    <option value="">Unassigned</option>
                    {activeMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="date" value={actionDueDate} onChange={(e) => setActionDueDate(e.target.value)} className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm text-[var(--color-text-primary)]" />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setActionFormOpen(false)} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">Cancel</button>
                  <button type="button" onClick={saveAction} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]">Save</button>
                </div>
                {actionError ? <p className="mt-1 text-xs text-[var(--color-danger)]">{actionError}</p> : null}
              </div>
            ) : null}

            <div className="space-y-2">
              {actionItems.map((item) => (
                <div key={item.id} className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
                  <p className="text-sm text-[var(--color-text-primary)]">{item.description}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      {item.ownerId && memberById.get(item.ownerId) ? <><Avatar name={memberById.get(item.ownerId)!.name} color={memberById.get(item.ownerId)!.avatar.color} size="sm" /><span>{memberById.get(item.ownerId)!.name}</span></> : <span>Unassigned</span>}
                      <span>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "No due date"}</span>
                    </div>
                    <button type="button" onClick={() => cycleStatus(item)} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-primary)]">
                      {item.status === "in_progress" ? "In Progress" : item.status === "complete" ? "Complete" : "Open"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
              <button type="button" onClick={() => setCarriedExpanded((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 text-sm text-[var(--color-text-primary)]">
                <span>Carried Over from Previous Sprints</span>
                <Badge label={`${carriedOverItems.length}`} color="default" />
              </button>
              {carriedExpanded ? (
                <div className="space-y-2 border-t border-[var(--color-border)] p-2">
                  {carriedOverItems.map((item) => {
                    const overdue = item.status !== "complete" && item.dueDate && new Date(item.dueDate).getTime() < Date.now();
                    return (
                      <div key={item.id} className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2" style={{ borderLeft: overdue ? "3px solid var(--color-danger)" : undefined }}>
                        <p className="text-sm text-[var(--color-text-primary)]">{item.description}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">From {sprintById.get(item.sprintId)?.name ?? "Previous Sprint"} Retrospective</p>
                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={() => cycleStatus(item)} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-primary)]">{item.status === "in_progress" ? "In Progress" : item.status === "complete" ? "Complete" : "Open"}</button>
                          <button type="button" onClick={() => api.retros.actionItems.update(id!, item.id, { status: "complete" }).then(() => loadBoard())} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">Mark Complete</button>
                          {retro.phase === "action_items" ? <button type="button" onClick={() => addCarried(item)} className="border border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-accent)]">Add to this retro</button> : null}
                        </div>
                      </div>
                    );
                  })}
                  {carriedOverItems.length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">No carried-over items.</p> : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[920px] gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((col) => (
              <div key={col.key} className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-[var(--color-text-primary)]">{col.label}</p>
                  <Badge label={`${cards.filter((c) => c.columnKey === col.key).length}`} color="default" />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">Reflect/Discuss board remains available.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAdvance}
        title={nextPhase ? `Move to ${phaseLabel(nextPhase)}?` : "Move phase?"}
        description={`Move to ${nextPhase ? phaseLabel(nextPhase) : "next phase"}? This cannot be undone.`}
        confirmLabel="Advance Phase"
        onCancel={() => setConfirmAdvance(false)}
        onConfirm={advancePhase}
      />

      {confirmClose ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "color-mix(in srgb, var(--color-bg-primary) 80%, transparent)" }}>
          <div className="w-full max-w-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <h2 className="font-heading text-3xl text-[var(--color-text-primary)]">Close this retrospective?</h2>
            <div className="mt-3 space-y-1 text-sm text-[var(--color-text-secondary)]">
              <p>{closeSummary.cards} cards captured</p>
              <p>{closeSummary.actionItems} action items created</p>
              <p>{closeSummary.carried} items carried over from previous sprints</p>
              <p>{closeSummary.openAfter} open action items after closing</p>
            </div>
            {closeSummary.openAfter > 0 ? (
              <p className="mt-3 text-sm text-[var(--color-warning)]">
                You have {closeSummary.openAfter} open action items. They will appear as carried over in the next sprint&apos;s retrospective.
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmClose(false)} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">Keep Open</button>
              <button type="button" onClick={closeRetro} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]">Close Retro</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
