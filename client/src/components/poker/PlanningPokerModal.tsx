// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import type { Sprint, Story, TeamMember } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { pickAvatarColor } from "../../lib/avatarPalette";
import { useToast } from "../feedback/ToastProvider";

const LS_MEMBER = "theRuck.poker.memberId";
const LS_NAME = "theRuck.poker.memberName";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Active sprint id + stories (caller may pass empty and we load). */
  sprintId: string | null;
  onSessionCreated: (sessionId: string) => void;
};

export function PlanningPokerModal({ open, onClose, sprintId: sprintIdProp, onSessionCreated }: Props) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberId, setMemberId] = useState(() => localStorage.getItem(LS_MEMBER) ?? "");
  const [sprintId, setSprintId] = useState<string | null>(sprintIdProp);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeEstimated, setIncludeEstimated] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [queue, setQueue] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSessionId(null);
    setSprintId(sprintIdProp);
    setMemberId(localStorage.getItem(LS_MEMBER) ?? "");
  }, [open, sprintIdProp]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await api.teamMembers.getAll();
        if (cancelled) return;
        setMembers(m.filter((x) => x.isActive));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !sprintId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await api.stories.getAll({ sprintId });
        if (!cancelled) {
          setStories(list);
          const initial: Record<string, boolean> = {};
          const q: string[] = [];
          for (const s of list) {
            if (s.storyPoints == null) {
              initial[s.id] = true;
              q.push(s.id);
            } else {
              initial[s.id] = false;
            }
          }
          setSelected(initial);
          setQueue(q);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load stories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sprintId, includeEstimated, toast]);

  const storyById = useMemo(() => {
    const m = new Map<string, Story>();
    stories.forEach((s) => m.set(s.id, s));
    return m;
  }, [stories]);

  const unestimatedStories = useMemo(() => stories.filter((s) => s.storyPoints == null), [stories]);

  function setChecked(id: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
    setQueue((q) => {
      if (checked) return q.includes(id) ? q : [...q, id];
      return q.filter((x) => x !== id);
    });
  }

  function selectAllUnestimated() {
    const nextSel: Record<string, boolean> = { ...selected };
    const q: string[] = [];
    for (const s of unestimatedStories) {
      nextSel[s.id] = true;
      q.push(s.id);
    }
    setSelected(nextSel);
    setQueue(q);
  }

  function moveInQueue(index: number, dir: -1 | 1) {
    const next = [...queue];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setQueue(next);
  }

  async function handleCreateSession() {
    const m = members.find((x) => x.id === memberId);
    if (!m || !sprintId) {
      toast.error("Pick a team member and ensure a sprint is selected.");
      return;
    }
    localStorage.setItem(LS_MEMBER, m.id);
    localStorage.setItem(LS_NAME, m.name);
    setCreating(true);
    try {
      const storyQueue = queue.filter((id) => selected[id]);
      if (storyQueue.length === 0) {
        toast.error("Select at least one story.");
        return;
      }
      const res = await api.poker.createSession({
        sprintId,
        storyQueue,
        memberId: m.id,
        memberName: m.name,
        avatarColor: pickAvatarColor(m.id)
      });
      setSessionId(res.sessionId);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not create session.");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  const shareUrl = `${window.location.origin}/poker/${sessionId ?? ""}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-xl">
        <h2 className="font-heading text-2xl text-[var(--color-text-primary)]">Planning Poker</h2>

        {step === 1 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">Who are you?</p>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2"
            >
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!memberId}
              onClick={() => setStep(2)}
              className="mt-2 w-full border border-[var(--color-accent)] bg-[var(--color-accent)] py-2 font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-4 space-y-3">
            {!sprintId ? (
              <p className="text-sm text-[var(--color-danger)]">No active sprint — start a sprint first.</p>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={includeEstimated}
                onChange={(e) => setIncludeEstimated(e.target.checked)}
              />
              Include already-estimated stories
            </label>
            {loading ? (
              <p className="text-sm text-[var(--color-text-muted)]">Loading stories…</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={selectAllUnestimated}
                  className="text-xs text-[var(--color-accent)] underline"
                >
                  Select all unestimated
                </button>
                <ul className="max-h-48 space-y-2 overflow-y-auto border border-[var(--color-border)] p-2">
                  {stories
                    .filter((s) => includeEstimated || s.storyPoints == null)
                    .map((s) => (
                      <li key={s.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!selected[s.id]}
                          onChange={(e) => setChecked(s.id, e.target.checked)}
                        />
                        <span>
                          {s.title}{" "}
                          <span className="text-[var(--color-text-muted)]">
                            {s.storyPoints == null ? "(unestimated)" : `(${s.storyPoints} pts)`}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
                <p className="text-xs text-[var(--color-text-muted)]">Queue order (use arrows)</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {queue.map((id, i) => (
                    <li key={id} className="flex items-center gap-2">
                      <span className="flex-1">{storyById.get(id)?.title ?? id}</span>
                      <button type="button" className="text-xs" onClick={() => moveInQueue(i, -1)}>
                        ↑
                      </button>
                      <button type="button" className="text-xs" onClick={() => moveInQueue(i, 1)}>
                        ↓
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={handleCreateSession}
                  disabled={creating || queue.length === 0 || !sprintId}
                  className="w-full border border-[var(--color-accent)] bg-[var(--color-accent)] py-2 font-semibold disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create session & continue"}
                </button>
              </>
            )}
          </div>
        ) : null}

        {step === 3 && sessionId ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">Share this link with your team:</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="flex-1 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm" />
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl);
                  toast.success("Copied.");
                }}
                className="border border-[var(--color-accent)]/60 bg-[var(--color-bg-tertiary)] px-3 py-1 text-sm text-[var(--color-accent)]"
              >
                Copy
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onSessionCreated(sessionId);
                onClose();
              }}
              className="w-full border border-[var(--color-accent)] bg-[var(--color-accent)] py-2 font-semibold"
            >
              Open poker room
            </button>
          </div>
        ) : null}

        <button type="button" onClick={onClose} className="mt-4 text-sm text-[var(--color-text-muted)] underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
