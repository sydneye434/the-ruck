// Developed by Sydney Edwards
import type { StoryPoints } from "@the-ruck/shared";

/** Planning poker card value (Fibonacci or special). */
export type PokerVoteValue = StoryPoints | "?" | "∞";

export type PokerPhase = "waiting" | "voting" | "revealed" | "complete";

export type PokerParticipant = {
  socketId: string;
  memberId: string;
  memberName: string;
  avatarColor: string;
  /** Shown only to self until reveal; others see `null` in masked payloads. */
  vote: PokerVoteValue | null;
  /** Whether this member has submitted a vote (visible to everyone during voting). */
  hasVoted?: boolean;
};

export type PokerEstimatedStory = {
  storyId: string;
  agreedPoints: StoryPoints;
  /** Number of voting rounds (reveals) before agreement for this story. */
  votingRound: number;
};

export type PokerSession = {
  id: string;
  sprintId: string;
  currentStoryId: string | null;
  phase: PokerPhase;
  participants: PokerParticipant[];
  /** Internal: authoritative votes before reveal. */
  votes: Record<string, PokerVoteValue>;
  agreedPoints: StoryPoints | null;
  storyQueue: string[];
  estimatedStories: PokerEstimatedStory[];
  facilitatorMemberId: string;
  facilitatorSocketId: string | null;
  /** Increments on each re-vote (session:reset); reset when advancing story. */
  votingRound: number;
};
