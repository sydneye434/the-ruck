// Developed by Sydney Edwards
import type { StoryPoints } from "@the-ruck/shared";

export type PokerVoteValue = StoryPoints | "?" | "∞";

export type PokerPhase = "waiting" | "voting" | "revealed" | "complete";

export type PokerParticipant = {
  socketId: string;
  memberId: string;
  memberName: string;
  avatarColor: string;
  vote: PokerVoteValue | null;
  hasVoted?: boolean;
};

export type PokerEstimatedStory = {
  storyId: string;
  agreedPoints: StoryPoints;
  votingRound: number;
};

export type PokerSessionPayload = {
  id: string;
  sprintId: string;
  currentStoryId: string | null;
  phase: PokerPhase;
  participants: PokerParticipant[];
  /** Populated during reveal; empty during voting (server-side). */
  votes: Record<string, PokerVoteValue>;
  agreedPoints: StoryPoints | null;
  storyQueue: string[];
  estimatedStories: PokerEstimatedStory[];
  facilitatorMemberId: string;
  facilitatorSocketId: string | null;
  votingRound: number;
  /** Present on socket updates; REST snapshot uses false. */
  isFacilitator?: boolean;
};
