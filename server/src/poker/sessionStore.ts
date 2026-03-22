// Developed by Sydney Edwards
import { randomUUID } from "node:crypto";
import type { PokerSession } from "./types";

const sessions = new Map<string, PokerSession>();

export function getPokerSession(id: string): PokerSession | undefined {
  return sessions.get(id);
}

export function setPokerSession(session: PokerSession): void {
  sessions.set(session.id, session);
}

export function deletePokerSession(id: string): void {
  sessions.delete(id);
}

export function createPokerSession(params: {
  sprintId: string;
  storyQueue: string[];
  facilitatorMemberId: string;
}): PokerSession {
  const id = randomUUID();
  const storyQueue = [...params.storyQueue];
  const currentStoryId = storyQueue.length > 0 ? storyQueue[0]! : null;
  const session: PokerSession = {
    id,
    sprintId: params.sprintId,
    currentStoryId,
    phase: storyQueue.length === 0 ? "complete" : "waiting",
    participants: [],
    votes: {},
    agreedPoints: null,
    storyQueue,
    estimatedStories: [],
    facilitatorMemberId: params.facilitatorMemberId,
    facilitatorSocketId: null,
    votingRound: 1
  };
  sessions.set(id, session);
  return session;
}

/** Test-only: clear all in-memory poker sessions. */
export function clearPokerSessionsForTests(): void {
  sessions.clear();
}

export function getPokerSessionCount(): number {
  return sessions.size;
}

export function getAllPokerSessions(): PokerSession[] {
  return Array.from(sessions.values());
}
