// Developed by Sydney Edwards
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import type { Story, StoryPoints, TeamMember } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { pickAvatarColor } from "../../lib/avatarPalette";
import { getSocketUrl } from "../../lib/socketUrl";
import type { PokerSessionPayload, PokerVoteValue } from "../../lib/pokerTypes";
import { Avatar } from "../../components/common/Avatar";

const FIB: StoryPoints[] = [0, 1, 2, 3, 5, 8, 13, 21];
const CARDS: (StoryPoints | "?" | "∞")[] = [...FIB, "?", "∞"];

const LS_MEMBER = "theRuck.poker.memberId";
const LS_NAME = "theRuck.poker.memberName";

function medianNumeric(nums: number[]): StoryPoints {
  if (nums.length === 0) return 5;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const m = s.length % 2 === 1 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
  return (FIB.find((f) => f >= m) ?? 5) as StoryPoints;
}

function consensusLabel(votes: PokerVoteValue[]): "consensus" | "near" | "wide" {
  const nums = votes.filter((v): v is StoryPoints => typeof v === "number");
  if (nums.length === 0) return "wide";
  const uniq = new Set(nums);
  if (uniq.size === 1) return "consensus";
  const order = FIB;
  const idxs = nums.map((n) => order.indexOf(n)).filter((i) => i >= 0);
  if (idxs.length < nums.length) return "wide";
  const spread = Math.max(...idxs) - Math.min(...idxs);
  return spread <= 1 ? "near" : "wide";
}

function distributionText(votes: PokerVoteValue[]): string {
  const map = new Map<string, number>();
  for (const v of votes) {
    const k = String(v);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${n} × ${k}pts`)
    .join(" · ");
}

export function PokerRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<PokerSessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [sprintName, setSprintName] = useState("");
  const [myMemberId, setMyMemberId] = useState(() => localStorage.getItem(LS_MEMBER) ?? "");
  const [descOpen, setDescOpen] = useState(false);
  const [acOpen, setAcOpen] = useState(false);
  const [flip, setFlip] = useState(false);

  const myId = myMemberId;

  useEffect(() => {
    if (myId) return;
    let cancelled = false;
    void api.teamMembers.getAll().then((m) => {
      if (!cancelled) setMembers(m.filter((x) => x.isActive));
    });
    return () => {
      cancelled = true;
    };
  }, [myId]);

  useEffect(() => {
    if (!sessionId || !myId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await api.poker.getSession(sessionId, myId);
        if (cancelled) return;
        setSession({ ...s, isFacilitator: s.isFacilitator ?? false });
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiClientError ? e.message : "Session not found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, myId]);

  useEffect(() => {
    if (!sessionId || !myId) return;
    const name = localStorage.getItem(LS_NAME) ?? "Member";
    const color = pickAvatarColor(myId);
    const s = io(getSocketUrl(), { transports: ["websocket", "polling"] });
    s.on("connect", () => {
      s.emit("session:join", {
        sessionId,
        memberId: myId,
        memberName: name,
        avatarColor: color
      });
    });
    s.on("session:updated", (payload: PokerSessionPayload) => {
      setSession(payload);
      setError(null);
      if (payload.phase === "revealed") {
        requestAnimationFrame(() => setFlip(true));
      } else {
        setFlip(false);
      }
    });
    s.on("session:error", (p: { message?: string }) => {
      setError(p?.message ?? "Socket error");
    });
    s.on("session:closed", () => {
      setEnded(true);
    });
    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
    };
  }, [sessionId, myId]);

  useEffect(() => {
    if (!session?.currentStoryId) {
      setCurrentStory(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const st = await api.stories.getById(session.currentStoryId!);
        if (!cancelled) setCurrentStory(st);
      } catch {
        if (!cancelled) setCurrentStory(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.currentStoryId]);

  useEffect(() => {
    if (!session?.sprintId) return;
    let cancelled = false;
    (async () => {
      try {
        const sp = await api.sprints.getById(session.sprintId);
        if (!cancelled && sp) setSprintName(sp.name);
        const m = await api.teamMembers.getAll();
        if (!cancelled) setMembers(m.filter((x) => x.isActive));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.sprintId]);

  const myVote = useMemo(() => {
    if (!session || !myId) return null;
    return session.participants.find((p) => p.memberId === myId)?.vote ?? null;
  }, [session, myId]);

  const revealedVotes = useMemo(() => {
    if (!session || session.phase !== "revealed") return [];
    return session.participants;
  }, [session]);

  const numericVotesForStats = useMemo(() => {
    if (!session || session.phase !== "revealed") return [];
    return session.participants
      .map((p) => p.vote)
      .filter((v): v is StoryPoints => typeof v === "number");
  }, [session]);

  const avg = useMemo(() => {
    if (numericVotesForStats.length === 0) return 0;
    return (
      Math.round(
        (numericVotesForStats.reduce((sum: number, n) => sum + n, 0) / numericVotesForStats.length) * 10
      ) / 10
    );
  }, [numericVotesForStats]);

  const cons = useMemo(() => {
    if (!session || session.phase !== "revealed") return null;
    const all = session.participants.map((p) => p.vote).filter((v) => v != null) as PokerVoteValue[];
    return consensusLabel(all);
  }, [session]);

  const [agreePts, setAgreePts] = useState<StoryPoints>(5);

  useEffect(() => {
    if (numericVotesForStats.length) setAgreePts(medianNumeric(numericVotesForStats));
  }, [numericVotesForStats]);

  const emit = useCallback(
    (ev: string, payload: Record<string, unknown>) => {
      if (!socket?.connected) return;
      socket.emit(ev, payload);
    },
    [socket]
  );

  if (!sessionId) {
    return <p className="p-6 text-[var(--color-text-muted)]">Invalid session.</p>;
  }

  if (!myId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] p-6">
        <h1 className="font-heading text-3xl text-[var(--color-text-primary)]">Who are you?</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Select your name to join planning poker.</p>
        <MemberPick
          members={members}
          onPick={(m) => {
            localStorage.setItem(LS_MEMBER, m.id);
            localStorage.setItem(LS_NAME, m.name);
            setMyMemberId(m.id);
          }}
        />
        <Link to="/sprint/active" className="text-sm text-[var(--color-accent)] underline">
          Back to sprint board
        </Link>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] p-6">
        <h1 className="font-heading text-2xl text-[var(--color-text-primary)]">Session not found or ended</h1>
        <p className="text-[var(--color-text-muted)]">{error}</p>
        <Link to="/sprint/active" className="text-[var(--color-accent)] underline">
          Back to sprint board
        </Link>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] p-6">
        <h1 className="font-heading text-2xl">Session ended</h1>
        <Link to="/sprint/active" className="text-[var(--color-accent)] underline">
          View sprint board
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-[var(--color-text-muted)]">Connecting…</p>
      </div>
    );
  }

  if (session.phase === "complete") {
    return (
      <CompleteScreen
        session={session}
        onClose={() => {
          emit("session:close", { sessionId });
          navigate("/sprint/active");
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="font-heading text-xl md:text-2xl">
          Planning Poker · <span className="text-[var(--color-text-secondary)]">{sprintName || "Sprint"}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {session.participants.map((p) => (
            <div key={p.socketId} className="relative flex items-center gap-1" title={p.memberName}>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-bg-primary)]" />
              <Avatar name={p.memberName} color={pickAvatarColor(p.memberId)} size="sm" />
              {session.facilitatorSocketId === p.socketId ? (
                <span className="text-xs" aria-hidden title="Facilitator">
                  👑
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        {currentStory ? (
          <section className="text-center">
            <h2 className="font-heading text-3xl text-[var(--color-text-primary)]">{currentStory.title}</h2>
            {currentStory.labels.length > 0 ? (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{currentStory.labels.join(", ")}</p>
            ) : null}
            {currentStory.storyPoints != null ? (
              <p className="mt-1 text-sm text-[var(--color-accent)]">Current estimate: {currentStory.storyPoints} pts</p>
            ) : null}
            <button
              type="button"
              onClick={() => setDescOpen((v) => !v)}
              className="mt-2 text-xs text-[var(--color-accent)] underline"
            >
              {descOpen ? "Hide" : "Show"} description
            </button>
            {descOpen ? (
              <p className="mt-2 text-left text-sm text-[var(--color-text-secondary)]">{currentStory.description || "—"}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setAcOpen((v) => !v)}
              className="mt-2 text-xs text-[var(--color-accent)] underline"
            >
              {acOpen ? "Hide" : "Show"} acceptance criteria
            </button>
            {acOpen ? (
              <ul className="mt-2 list-inside list-disc text-left text-sm text-[var(--color-text-secondary)]">
                {currentStory.acceptanceCriteria.length ? (
                  currentStory.acceptanceCriteria.map((line) => <li key={line}>{line}</li>)
                ) : (
                  <li>—</li>
                )}
              </ul>
            ) : null}
          </section>
        ) : (
          <p className="text-center text-[var(--color-text-muted)]">Loading story…</p>
        )}

        {session.phase === "voting" ? (
          <>
            <div className="flex flex-wrap justify-center gap-2">
              {CARDS.map((c) => {
                const selected = myVote === c;
                return (
                  <button
                    key={String(c)}
                    type="button"
                    onClick={() => emit("session:vote", { sessionId, memberId: myId, vote: c })}
                    className={[
                      "flex h-28 w-16 flex-col items-center justify-center rounded-lg border-2 text-xl font-bold shadow-md transition-transform",
                      selected
                        ? "scale-105 border-[var(--color-accent)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/45"
                    ].join(" ")}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="text-center text-sm text-[var(--color-text-secondary)]">
              {myVote != null ? "Waiting for others…" : "Pick a card to vote"}
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              {session.participants.map((p) => {
                const voted = p.hasVoted ?? p.vote != null;
                return (
                  <span key={p.socketId} className="flex items-center gap-1 text-[var(--color-text-muted)]">
                    <Avatar name={p.memberName} color={pickAvatarColor(p.memberId)} size="sm" />
                    {voted ? "✓" : "⏳"} {p.memberName}
                  </span>
                );
              })}
            </div>
            {session.isFacilitator ? (
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => emit("session:reveal", { sessionId })}
                  className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 font-semibold text-[var(--color-text-primary)]"
                >
                  Reveal votes
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {session.phase === "revealed" ? (
          <>
            <div className="flex flex-wrap justify-center gap-4 [perspective:1000px]">
              {revealedVotes.map((p) => (
                <div key={p.memberId} className="flex flex-col items-center gap-2">
                  <div
                    className={[
                      "relative h-32 w-20 [transform-style:preserve-3d] transition-transform duration-700",
                      flip ? "[transform:rotateY(180deg)]" : ""
                    ].join(" ")}
                  >
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-bg-tertiary)] [backface-visibility:hidden]">
                      ?
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-bg-secondary)] text-2xl font-bold [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      {p.vote == null ? "—" : String(p.vote)}
                    </div>
                  </div>
                  <Avatar name={p.memberName} color={pickAvatarColor(p.memberId)} size="sm" />
                  <span className="max-w-[5rem] truncate text-center text-xs text-[var(--color-text-muted)]">{p.memberName}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm">
              <p className="font-semibold text-[var(--color-text-primary)]">Summary</p>
              <p className="mt-1 text-[var(--color-text-secondary)]">
                {distributionText(
                  revealedVotes.map((p) => p.vote).filter((v): v is PokerVoteValue => v != null)
                )}
              </p>
              <p className="mt-1 text-[var(--color-text-secondary)]">Average (numeric): {avg}</p>
              <p className="mt-2">
                {cons === "consensus" ? (
                  <span className="rounded border border-[var(--color-accent)]/50 bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-bg-secondary))] px-2 py-1 text-[var(--color-accent)]">
                    Consensus!
                  </span>
                ) : cons === "near" ? (
                  <span className="rounded border border-[var(--color-avatar-5)]/45 bg-[color-mix(in_srgb,var(--color-avatar-3)_32%,var(--color-bg-secondary))] px-2 py-1 text-[var(--color-text-primary)]">
                    Near consensus
                  </span>
                ) : (
                  <span className="rounded border border-[var(--color-avatar-8)]/55 bg-[color-mix(in_srgb,var(--color-avatar-8)_28%,var(--color-bg-secondary))] px-2 py-1 text-[var(--color-text-primary)]">
                    Wide spread — discuss
                  </span>
                )}
              </p>
            </div>
            {session.isFacilitator ? (
              <div className="flex flex-col items-center gap-3 border-t border-[var(--color-border)] pt-4">
                <label className="flex items-center gap-2 text-sm">
                  Agreed points
                  <select
                    value={agreePts}
                    onChange={(e) => setAgreePts(Number(e.target.value) as StoryPoints)}
                    className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1"
                  >
                    {FIB.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => emit("session:agree", { sessionId, points: agreePts })}
                    className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 font-semibold"
                  >
                    Save &amp; next story
                  </button>
                  <button
                    type="button"
                    onClick={() => emit("session:reset", { sessionId })}
                    className="border border-[var(--color-border)] px-4 py-2"
                  >
                    Re-vote
                  </button>
                  <button
                    type="button"
                    onClick={() => emit("session:next", { sessionId })}
                    className="border border-[var(--color-border)] px-4 py-2"
                  >
                    Skip story
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {error ? <p className="text-center text-sm text-[var(--color-danger)]">{error}</p> : null}
      </main>
    </div>
  );
}

function MemberPick({ members, onPick }: { members: TeamMember[]; onPick: (m: TeamMember) => void }) {
  const [id, setId] = useState(members[0]?.id ?? "");
  return (
    <div className="flex gap-2">
      <select
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2"
      >
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          const m = members.find((x) => x.id === id);
          if (m) onPick(m);
        }}
        className="bg-[var(--color-accent)] px-4 py-2 font-semibold"
      >
        Continue
      </button>
    </div>
  );
}

function CompleteScreen({
  session,
  onClose
}: {
  session: PokerSessionPayload;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [titles, setTitles] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const m: Record<string, string> = {};
      for (const row of session.estimatedStories) {
        try {
          const s = await api.stories.getById(row.storyId);
          m[row.storyId] = s.title;
        } catch {
          m[row.storyId] = row.storyId.slice(0, 8);
        }
      }
      if (!cancelled) setTitles(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.estimatedStories]);

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-[var(--color-bg-primary)] px-4 py-10">
      <h1 className="font-heading text-4xl text-[var(--color-accent)]">Estimation complete!</h1>
      <table className="w-full max-w-2xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            <th className="p-2">Story</th>
            <th className="p-2">Rounds</th>
            <th className="p-2">Agreed</th>
          </tr>
        </thead>
        <tbody>
          {session.estimatedStories.map((row) => (
            <tr key={row.storyId} className="border-b border-[var(--color-border)]">
              <td className="p-2">{titles[row.storyId] ?? row.storyId.slice(0, 8)}…</td>
              <td className="p-2">{row.votingRound}</td>
              <td className="p-2">{row.agreedPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate("/sprint/active")}
          className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 font-semibold"
        >
          View sprint board
        </button>
        <button type="button" onClick={onClose} className="border border-[var(--color-border)] px-4 py-2">
          Close session
        </button>
      </div>
    </div>
  );
}
