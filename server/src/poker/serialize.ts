// Developed by Sydney Edwards
import type { PokerParticipant, PokerSession } from "./types";

export function syncParticipantVotes(session: PokerSession): void {
  for (const p of session.participants) {
    p.vote = session.votes[p.memberId] ?? null;
    p.hasVoted = Object.prototype.hasOwnProperty.call(session.votes, p.memberId);
  }
}

/** Public session snapshot; masks other players' votes until reveal. */
export function cloneSessionForViewer(session: PokerSession, viewerMemberId: string | null): PokerSession {
  const raw = JSON.parse(JSON.stringify(session)) as PokerSession;
  syncParticipantVotes(raw);
  if (raw.phase === "revealed" || raw.phase === "complete") {
    return raw;
  }
  raw.votes = {};
  for (const p of raw.participants) {
    if (viewerMemberId && p.memberId === viewerMemberId) continue;
    p.vote = null;
  }
  return raw;
}
