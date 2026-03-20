// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Retro, RetroCard, Sprint, TeamMember } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { Avatar } from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/dialog/ConfirmDialog";
import { useToast } from "../../components/feedback/ToastProvider";

const CURRENT_MEMBER_KEY = "the-ruck.retro.currentMemberId";
type SortMode = "recent" | "upvotes";

function dateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })}`;
}

const PHASES: Retro["phase"][] = ["reflect", "discuss", "action_items"];
function phaseLabel(phase: Retro["phase"]) {
  if (phase === "action_items") return "Action Items";
  if (phase === "discuss") return "Discuss";
  return "Reflect";
}

export function RetroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retro, setRetro] = useState<Retro | null>(null);
  const [columns, setColumns] = useState<Array<{ key: string; label: string; color: string }>>([]);
  const [cards, setCards] = useState<RetroCard[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string>("");
  const [composerColumn, setComposerColumn] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RetroCard | null>(null);
  const [phaseConfirmOpen, setPhaseConfirmOpen] = useState(false);
  const [upvotePulseId, setUpvotePulseId] = useState<string | null>(null);
  const [groupingSourceId, setGroupingSourceId] = useState<string | null>(null);
  const [sortByColumn, setSortByColumn] = useState<Record<string, SortMode>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const sprintById = useMemo(() => new Map(sprints.map((s) => [s.id, s])), [sprints]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const sprint = retro ? sprintById.get(retro.sprintId) ?? null : null;
  const currentMember = currentMemberId ? memberById.get(currentMemberId) ?? null : null;
  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const phaseIndex = retro ? PHASES.indexOf(retro.phase) : -1;
  const nextPhase = phaseIndex >= 0 && phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1] : null;

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
      setSprints(sprintsData);
      setMembers(membersData);
      setSortByColumn((prev) => {
        const next = { ...prev };
        board.columns.forEach((c) => {
          if (!next[c.key]) next[c.key] = board.retro.phase === "discuss" ? "upvotes" : "recent";
        });
        return next;
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load retro board.");
    } finally {
      setLoading(false);
    }
  }

  async function pollCards() {
    if (!id || document.visibilityState !== "visible") return;
    try {
      const latest = await api.retros.cards.getAll(id);
      setCards((prev) => {
        const editingSet = new Set<string>(editingId ? [editingId] : []);
        const map = new Map(prev.map((c) => [c.id, c]));
        latest.forEach((card) => {
          if (editingSet.has(card.id)) return;
          map.set(card.id, card);
        });
        return Array.from(map.values()).filter((c) => latest.some((x) => x.id === c.id));
      });
    } catch {
      // silent polling failure
    }
  }

  useEffect(() => {
    loadBoard();
  }, [id]);

  useEffect(() => {
    if (!activeMembers.length) return;
    const stored = localStorage.getItem(CURRENT_MEMBER_KEY);
    if (stored && activeMembers.some((m) => m.id === stored)) {
      setCurrentMemberId(stored);
    } else {
      setCurrentMemberId(activeMembers[0].id);
    }
  }, [activeMembers]);

  useEffect(() => {
    if (!currentMemberId) return;
    localStorage.setItem(CURRENT_MEMBER_KEY, currentMemberId);
  }, [currentMemberId]);

  useEffect(() => {
    if (!retro || retro.phase !== "discuss") return;
    setSortByColumn((prev) => {
      const next = { ...prev };
      columns.forEach((c) => (next[c.key] = "upvotes"));
      return next;
    });
  }, [retro?.phase, columns.map((c) => c.key).join("|")]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") pollCards();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") pollCards();
    }, 30000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [id, editingId]);

  async function toggleAnonymous() {
    if (!retro) return;
    const next = !retro.isAnonymous;
    setRetro({ ...retro, isAnonymous: next });
    try {
      const updated = await api.retros.update(retro.id, { isAnonymous: next });
      setRetro(updated);
    } catch (e) {
      setRetro(retro);
      toast.error(e instanceof ApiClientError ? e.message : "Failed to update anonymity.");
    }
  }

  async function advancePhase() {
    if (!retro || !nextPhase) return;
    try {
      const updated = await api.retros.update(retro.id, { phase: nextPhase });
      setRetro(updated);
      setPhaseConfirmOpen(false);
      toast.success(`Moved to ${phaseLabel(nextPhase)}.`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to advance phase.");
    }
  }

  async function submitCard(columnKey: string) {
    if (!id || !currentMemberId) return;
    if (!composerText.trim()) {
      setComposerError("Card content is required.");
      return;
    }
    const optimistic: RetroCard = {
      id: `tmp-${crypto.randomUUID()}`,
      retroId: id,
      columnKey,
      authorId: currentMemberId,
      content: composerText.trim(),
      upvotes: [],
      groupId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCards((prev) => [optimistic, ...prev]);
    setComposerError(null);
    try {
      const created = await api.retros.cards.create(id, {
        columnKey,
        authorId: currentMemberId,
        content: composerText.trim()
      });
      setCards((prev) => [created, ...prev.filter((c) => c.id !== optimistic.id)]);
      setComposerText("");
      setComposerColumn(null);
    } catch (e) {
      setCards((prev) => prev.filter((c) => c.id !== optimistic.id));
      setComposerError(e instanceof ApiClientError ? e.message : "Failed to add card.");
    }
  }

  async function saveEdit(card: RetroCard) {
    if (!id) return;
    try {
      const updated = await api.retros.cards.update(id, card.id, { content: editingText.trim() });
      setCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));
      setEditingId(null);
      setEditingText("");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to update card.");
    }
  }

  async function deleteCard() {
    if (!id || !deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setCards((prev) => prev.filter((c) => c.id !== target.id));
    try {
      await api.retros.cards.delete(id, target.id);
    } catch (e) {
      await loadBoard();
      toast.error(e instanceof ApiClientError ? e.message : "Failed to delete card.");
    }
  }

  async function toggleUpvote(card: RetroCard) {
    if (!id || !currentMemberId) return;
    const had = card.upvotes.includes(currentMemberId);
    const optimistic = had
      ? card.upvotes.filter((m) => m !== currentMemberId)
      : [...card.upvotes, currentMemberId];
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, upvotes: optimistic } : c)));
    setUpvotePulseId(card.id);
    window.setTimeout(() => setUpvotePulseId((prev) => (prev === card.id ? null : prev)), 220);
    try {
      const updated = await api.retros.cards.upvote(id, card.id, currentMemberId);
      setCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));
    } catch (e) {
      setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
      toast.error(e instanceof ApiClientError ? e.message : "Failed to upvote.");
    }
  }

  async function groupWith(source: RetroCard, target: RetroCard) {
    if (!id || source.id === target.id) return;
    const gid = source.groupId || target.groupId || crypto.randomUUID();
    const previous = cards;
    setCards((prev) =>
      prev.map((c) => (c.id === source.id || c.id === target.id ? { ...c, groupId: gid } : c))
    );
    setGroupingSourceId(null);
    try {
      await Promise.all([
        api.retros.cards.group(id, source.id, gid),
        api.retros.cards.group(id, target.id, gid)
      ]);
    } catch (e) {
      setCards(previous);
      toast.error(e instanceof ApiClientError ? e.message : "Failed to group cards.");
    }
  }

  async function removeFromGroup(card: RetroCard) {
    if (!id) return;
    const previous = cards;
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, groupId: null } : c)));
    try {
      await api.retros.cards.group(id, card.id, null);
    } catch (e) {
      setCards(previous);
      toast.error(e instanceof ApiClientError ? e.message : "Failed to remove group.");
    }
  }

  function columnCards(columnKey: string) {
    const scoped = cards.filter((c) => c.columnKey === columnKey);
    const grouped = new Map<string, RetroCard[]>();
    const singles: RetroCard[] = [];
    scoped.forEach((c) => {
      if (c.groupId) {
        grouped.set(c.groupId, [...(grouped.get(c.groupId) ?? []), c]);
      } else {
        singles.push(c);
      }
    });
    const sortMode = sortByColumn[columnKey] ?? (retro?.phase === "discuss" ? "upvotes" : "recent");
    const sorter = (a: RetroCard, b: RetroCard) => {
      if (sortMode === "upvotes") {
        const d = b.upvotes.length - a.upvotes.length;
        if (d !== 0) return d;
      }
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    };
    const groupedBlocks = Array.from(grouped.values()).map((arr) => arr.sort(sorter)).sort((a, b) => sorter(a[0], b[0]));
    const sortedSingles = singles.sort(sorter);
    return { groupedBlocks, singles: sortedSingles };
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />)}</div>;
  if (error || !retro) return <EmptyState title="Could not load retro" description={error ?? "Retro not found."} action={<button type="button" onClick={loadBoard} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]">Retry</button>} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title={retro.title}
        subtitle={`${sprint?.name ?? "Unknown Sprint"} · ${sprint ? dateRange(sprint.startDate, sprint.endDate) : "No dates"}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge label={phaseLabel(retro.phase)} color="accent" />
            <Badge label={columns.length ? columns.length === 4 ? "4Ls" : retro.template : retro.template} color="default" />
            <button type="button" onClick={toggleAnonymous} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-primary)]">
              {retro.isAnonymous ? "Anonymous: ON" : "Anonymous: OFF"}
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2">
        <div className="flex items-center gap-2">
          {PHASES.map((phase, idx) => (
            <div key={phase} className="flex items-center gap-2">
              <span className={idx <= phaseIndex ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}>
                {phaseLabel(phase)}
              </span>
              {idx < PHASES.length - 1 ? <span className="text-[var(--color-text-muted)]">-</span> : null}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {nextPhase ? (
            <button type="button" onClick={() => setPhaseConfirmOpen(true)} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
              Advance Phase
            </button>
          ) : (
            <button type="button" onClick={() => navigate("/retros")} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]">
              Close Retro
            </button>
          )}
        </div>
      </div>

      {retro.phase === "discuss" ? (
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-text-secondary)]">
          Discussion phase - vote on cards and group related themes
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="grid min-w-[920px] gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((column) => {
            const colData = columnCards(column.key);
            const count = cards.filter((c) => c.columnKey === column.key).length;
            return (
              <section key={column.key} className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <header className="flex items-center justify-between border-b border-[var(--color-border)] p-2" style={{ borderLeft: `3px solid var(${column.color})` }}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--color-text-primary)]">{column.label}</p>
                    <Badge label={`${count}`} color="default" />
                  </div>
                  {retro.phase === "discuss" ? (
                    <select
                      value={sortByColumn[column.key] ?? "upvotes"}
                      onChange={(e) => setSortByColumn((prev) => ({ ...prev, [column.key]: e.target.value as SortMode }))}
                      className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-1 py-0.5 text-xs text-[var(--color-text-primary)]"
                    >
                      <option value="recent">Recent</option>
                      <option value="upvotes">Most Upvoted</option>
                    </select>
                  ) : null}
                </header>
                <div className="space-y-2 p-2">
                  <button type="button" onClick={() => { setComposerColumn(column.key); setComposerText(""); setComposerError(null); }} className="w-full border border-dashed border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-left text-sm text-[var(--color-text-secondary)]">
                    Add Card
                  </button>

                  {composerColumn === column.key ? (
                    <div className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
                      <textarea
                        autoFocus
                        maxLength={500}
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setComposerColumn(null);
                        }}
                        rows={4}
                        className="w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-text-primary)]"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <select
                          value={currentMemberId}
                          onChange={(e) => setCurrentMemberId(e.target.value)}
                          className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1 py-1 text-xs text-[var(--color-text-primary)]"
                        >
                          {activeMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              Adding as {m.name}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-[var(--color-text-muted)]">{composerText.length} / 500</span>
                      </div>
                      {composerError ? <p className="mt-1 text-xs text-[var(--color-danger)]">{composerError}</p> : null}
                      <div className="mt-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setComposerColumn(null)} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">Cancel</button>
                        <button type="button" onClick={() => submitCard(column.key)} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]">Submit</button>
                      </div>
                    </div>
                  ) : null}

                  {colData.groupedBlocks.map((group) => (
                    <div key={group[0].groupId ?? group[0].id} className="space-y-1">
                      <div className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
                        Group · {group.length} cards
                      </div>
                      {group.map((card) => (
                        <CardItem
                          key={card.id}
                          card={card}
                          retro={retro}
                          member={memberById.get(card.authorId) ?? null}
                          isCurrentUser={card.authorId === currentMemberId}
                          isUpvoted={card.upvotes.includes(currentMemberId)}
                          pulse={upvotePulseId === card.id}
                          groupingMode={Boolean(groupingSourceId)}
                          groupingSourceId={groupingSourceId}
                          editingId={editingId}
                          editingText={editingText}
                          setEditingId={setEditingId}
                          setEditingText={setEditingText}
                          onSaveEdit={saveEdit}
                          onDelete={() => setDeleteTarget(card)}
                          onToggleUpvote={() => toggleUpvote(card)}
                          onOpenMenu={() => setMenuOpenId(card.id)}
                          menuOpen={menuOpenId === card.id}
                          onCloseMenu={() => setMenuOpenId(null)}
                          onGroupWith={() => {
                            if (!groupingSourceId) setGroupingSourceId(card.id);
                            else {
                              const source = cards.find((c) => c.id === groupingSourceId);
                              if (source) groupWith(source, card);
                            }
                          }}
                          onRemoveGroup={() => removeFromGroup(card)}
                        />
                      ))}
                    </div>
                  ))}

                  {colData.singles.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      retro={retro}
                      member={memberById.get(card.authorId) ?? null}
                      isCurrentUser={card.authorId === currentMemberId}
                      isUpvoted={card.upvotes.includes(currentMemberId)}
                      pulse={upvotePulseId === card.id}
                      groupingMode={Boolean(groupingSourceId)}
                      groupingSourceId={groupingSourceId}
                      editingId={editingId}
                      editingText={editingText}
                      setEditingId={setEditingId}
                      setEditingText={setEditingText}
                      onSaveEdit={saveEdit}
                      onDelete={() => setDeleteTarget(card)}
                      onToggleUpvote={() => toggleUpvote(card)}
                      onOpenMenu={() => setMenuOpenId(card.id)}
                      menuOpen={menuOpenId === card.id}
                      onCloseMenu={() => setMenuOpenId(null)}
                      onGroupWith={() => {
                        if (!groupingSourceId) setGroupingSourceId(card.id);
                        else {
                          const source = cards.find((c) => c.id === groupingSourceId);
                          if (source) groupWith(source, card);
                        }
                      }}
                      onRemoveGroup={() => removeFromGroup(card)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={phaseConfirmOpen}
        title={nextPhase ? `Move to ${phaseLabel(nextPhase)}?` : "Advance phase?"}
        description={`Move to ${nextPhase ? phaseLabel(nextPhase) : "next phase"}? This cannot be undone.`}
        confirmLabel="Advance"
        onCancel={() => setPhaseConfirmOpen(false)}
        onConfirm={advancePhase}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete card?"
        description="This card will be permanently removed."
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteCard}
      />
    </div>
  );
}

function CardItem({
  card,
  retro,
  member,
  isCurrentUser,
  isUpvoted,
  pulse,
  groupingMode,
  groupingSourceId,
  editingId,
  editingText,
  setEditingId,
  setEditingText,
  onSaveEdit,
  onDelete,
  onToggleUpvote,
  onOpenMenu,
  onCloseMenu,
  menuOpen,
  onGroupWith,
  onRemoveGroup
}: {
  card: RetroCard;
  retro: Retro;
  member: TeamMember | null;
  isCurrentUser: boolean;
  isUpvoted: boolean;
  pulse: boolean;
  groupingMode: boolean;
  groupingSourceId: string | null;
  editingId: string | null;
  editingText: string;
  setEditingId: (id: string | null) => void;
  setEditingText: (v: string) => void;
  onSaveEdit: (card: RetroCard) => void;
  onDelete: () => void;
  onToggleUpvote: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  menuOpen: boolean;
  onGroupWith: () => void;
  onRemoveGroup: () => void;
}) {
  const editing = editingId === card.id;
  const timestamp = card.createdAt
    ? new Date(card.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2"
      style={{
        borderLeft: card.groupId ? "2px solid var(--color-accent)" : undefined,
        background:
          card.groupId
            ? "color-mix(in srgb, var(--color-bg-primary) 85%, var(--color-accent) 15%)"
            : undefined,
        outline:
          groupingMode && groupingSourceId !== card.id ? "1px dashed var(--color-accent)" : undefined
      }}
      onClick={() => {
        if (groupingMode && groupingSourceId !== card.id) onGroupWith();
      }}
    >
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editingText}
            maxLength={500}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => onSaveEdit(card)}
            rows={4}
            className="w-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-text-primary)]"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingId(null)} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">Cancel</button>
            <button type="button" onClick={() => onSaveEdit(card)} className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)]">Save</button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{card.content}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              {retro.isAnonymous ? (
                <>
                  <span>Anonymous</span>
                  <span>{timestamp}</span>
                </>
              ) : (
                <>
                  <Avatar name={member?.name ?? "Member"} color={member?.avatar.color ?? "var(--color-avatar-1)"} size="sm" />
                  <span>{member?.name ?? "Unknown"}</span>
                  <span>{timestamp}</span>
                </>
              )}
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleUpvote}
                className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs"
                style={{ color: isUpvoted ? "var(--color-accent)" : "var(--color-text-secondary)" }}
              >
                👍{" "}
                <span style={{ display: "inline-block", transform: pulse ? "scale(1.18)" : "scale(1)", transition: "transform 180ms ease" }}>
                  {card.upvotes.length}
                </span>
              </button>
              <button type="button" onClick={() => (menuOpen ? onCloseMenu() : onOpenMenu())} className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                ...
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-8 z-10 min-w-[130px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs">
                  {isCurrentUser ? (
                    <>
                      <button type="button" onClick={() => { setEditingId(card.id); setEditingText(card.content); onCloseMenu(); }} className="block w-full px-2 py-1.5 text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">Edit</button>
                      <button type="button" onClick={() => { onDelete(); onCloseMenu(); }} className="block w-full px-2 py-1.5 text-left text-[var(--color-danger)] hover:bg-[var(--color-bg-tertiary)]">Delete</button>
                    </>
                  ) : null}
                  {retro.phase === "discuss" ? (
                    <button type="button" onClick={() => { onGroupWith(); onCloseMenu(); }} className="block w-full px-2 py-1.5 text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">Group with...</button>
                  ) : null}
                  {card.groupId ? (
                    <button type="button" onClick={() => { onRemoveGroup(); onCloseMenu(); }} className="block w-full px-2 py-1.5 text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]">Remove from group</button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
