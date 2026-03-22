// Developed by Sydney Edwards
import type { Server, Socket } from "socket.io";
import type { StoryPoints } from "@the-ruck/shared";
import { storiesRepository } from "../repositories";
import {
  createPokerSession,
  deletePokerSession,
  getAllPokerSessions,
  getPokerSession,
  setPokerSession
} from "../poker/sessionStore";
import { cloneSessionForViewer, syncParticipantVotes } from "../poker/serialize";
import type { PokerParticipant, PokerSession, PokerVoteValue } from "../poker/types";

const FIB = [0, 1, 2, 3, 5, 8, 13, 21] as const;

function broadcastSession(io: Server, session: PokerSession): void {
  const room = session.id;
  const sockets = io.sockets.adapter.rooms.get(room);
  if (!sockets) return;
  syncParticipantVotes(session);
  for (const socketId of sockets) {
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) continue;
    const mid = (sock.data as { memberId?: string }).memberId ?? null;
    sock.emit("session:updated", {
      ...cloneSessionForViewer(session, mid),
      isFacilitator: session.facilitatorSocketId === sock.id
    });
  }
}

function isFacilitatorSocket(socket: Socket, session: PokerSession): boolean {
  return session.facilitatorSocketId === socket.id;
}

function pickNextFacilitator(session: PokerSession): void {
  if (session.participants.length === 0) {
    session.facilitatorSocketId = null;
    return;
  }
  const next = session.participants[0]!;
  session.facilitatorSocketId = next.socketId;
  session.facilitatorMemberId = next.memberId;
}

function parseVote(v: unknown): PokerVoteValue | null {
  if (v === "?" || v === "∞") return v;
  if (typeof v === "number" && FIB.includes(v as (typeof FIB)[number])) return v as StoryPoints;
  return null;
}

function parseAgreedPoints(v: unknown): StoryPoints | null {
  if (typeof v === "number" && (FIB as readonly number[]).includes(v)) return v as StoryPoints;
  return null;
}

export function initPokerSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on(
      "session:create",
      (
        payload: {
          sprintId: string;
          storyQueue: string[];
          memberId: string;
          memberName: string;
          avatarColor: string;
        },
        ack?: (err: Error | null, data?: { sessionId: string }) => void
      ) => {
        try {
          if (!payload?.sprintId || !Array.isArray(payload.storyQueue) || !payload.memberId) {
            throw new Error("Invalid session:create payload");
          }
          const session = createPokerSession({
            sprintId: String(payload.sprintId),
            storyQueue: payload.storyQueue.map(String),
            facilitatorMemberId: String(payload.memberId)
          });
          joinSocketToSession(io, socket, session, {
            memberId: String(payload.memberId),
            memberName: String(payload.memberName ?? "Member"),
            avatarColor: String(payload.avatarColor ?? "#888888")
          });
          ack?.(null, { sessionId: session.id });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "session:create failed";
          socket.emit("session:error", { message: msg });
          ack?.(new Error(msg));
        }
      }
    );

    socket.on(
      "session:join",
      (payload: {
        sessionId: string;
        memberId: string;
        memberName: string;
        avatarColor: string;
      }) => {
        try {
          const session = getPokerSession(String(payload?.sessionId ?? ""));
          if (!session) {
            socket.emit("session:error", { message: "Session not found" });
            return;
          }
          joinSocketToSession(io, socket, session, {
            memberId: String(payload.memberId),
            memberName: String(payload.memberName ?? "Member"),
            avatarColor: String(payload.avatarColor ?? "#888888")
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "session:join failed";
          socket.emit("session:error", { message: msg });
        }
      }
    );

    socket.on(
      "session:vote",
      (payload: { sessionId: string; memberId: string; vote: unknown }) => {
        const session = getPokerSession(String(payload?.sessionId ?? ""));
        if (!session) {
          socket.emit("session:error", { message: "Session not found" });
          return;
        }
        const memberId = String(payload.memberId ?? "");
        const vote = parseVote(payload.vote);
        if (vote === null) {
          socket.emit("session:error", { message: "Invalid vote" });
          return;
        }
        const p = session.participants.find((x) => x.socketId === socket.id && x.memberId === memberId);
        if (!p) {
          socket.emit("session:error", { message: "Not in session" });
          return;
        }
        if (session.phase !== "voting") {
          socket.emit("session:error", { message: "Not in voting phase" });
          return;
        }
        session.votes[memberId] = vote;
        syncParticipantVotes(session);
        setPokerSession(session);
        broadcastSession(io, session);
      }
    );

    socket.on("session:reveal", (payload: { sessionId: string }) => {
      const session = getPokerSession(String(payload?.sessionId ?? ""));
      if (!session) {
        socket.emit("session:error", { message: "Session not found" });
        return;
      }
      if (!isFacilitatorSocket(socket, session)) {
        socket.emit("session:error", { message: "Only facilitator can reveal" });
        return;
      }
      if (session.phase !== "voting") {
        socket.emit("session:error", { message: "Cannot reveal now" });
        return;
      }
      session.phase = "revealed";
      syncParticipantVotes(session);
      setPokerSession(session);
      broadcastSession(io, session);
    });

    socket.on("session:reset", (payload: { sessionId: string }) => {
      const session = getPokerSession(String(payload?.sessionId ?? ""));
      if (!session) {
        socket.emit("session:error", { message: "Session not found" });
        return;
      }
      if (!isFacilitatorSocket(socket, session)) {
        socket.emit("session:error", { message: "Only facilitator can reset" });
        return;
      }
      session.votes = {};
      session.votingRound += 1;
      session.phase = "voting";
      syncParticipantVotes(session);
      setPokerSession(session);
      broadcastSession(io, session);
    });

    socket.on(
      "session:agree",
      async (payload: { sessionId: string; points: unknown }, ack?: (err: Error | null) => void) => {
        try {
          const session = getPokerSession(String(payload?.sessionId ?? ""));
          if (!session) {
            socket.emit("session:error", { message: "Session not found" });
            ack?.(new Error("not found"));
            return;
          }
          if (!isFacilitatorSocket(socket, session)) {
            socket.emit("session:error", { message: "Only facilitator can agree" });
            ack?.(new Error("forbidden"));
            return;
          }
          const points = parseAgreedPoints(payload.points);
          if (points === null) {
            socket.emit("session:error", { message: "Invalid points" });
            ack?.(new Error("invalid"));
            return;
          }
          const storyId = session.currentStoryId;
          if (!storyId) {
            socket.emit("session:error", { message: "No current story" });
            return;
          }
          await storiesRepository.update(storyId, { storyPoints: points });
          session.estimatedStories.push({
            storyId,
            agreedPoints: points,
            votingRound: session.votingRound
          });
          session.storyQueue = session.storyQueue.filter((id) => id !== storyId);
          session.votes = {};
          session.votingRound = 1;
          session.phase = "voting";
          session.agreedPoints = points;
          if (session.storyQueue.length === 0) {
            session.currentStoryId = null;
            session.phase = "complete";
          } else {
            session.currentStoryId = session.storyQueue[0]!;
          }
          syncParticipantVotes(session);
          setPokerSession(session);
          broadcastSession(io, session);
          ack?.(null);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "agree failed";
          socket.emit("session:error", { message: msg });
          ack?.(new Error(msg));
        }
      }
    );

    socket.on("session:next", (payload: { sessionId: string }) => {
      const session = getPokerSession(String(payload?.sessionId ?? ""));
      if (!session) {
        socket.emit("session:error", { message: "Session not found" });
        return;
      }
      if (!isFacilitatorSocket(socket, session)) {
        socket.emit("session:error", { message: "Only facilitator can skip" });
        return;
      }
      const storyId = session.currentStoryId;
      if (!storyId) return;
      session.storyQueue = session.storyQueue.filter((id) => id !== storyId);
      session.votes = {};
      session.votingRound = 1;
      if (session.storyQueue.length === 0) {
        session.currentStoryId = null;
        session.phase = "complete";
      } else {
        session.currentStoryId = session.storyQueue[0]!;
        session.phase = "voting";
      }
      syncParticipantVotes(session);
      setPokerSession(session);
      broadcastSession(io, session);
    });

    socket.on("session:close", (payload: { sessionId: string }) => {
      const session = getPokerSession(String(payload?.sessionId ?? ""));
      if (!session) return;
      if (!isFacilitatorSocket(socket, session)) {
        socket.emit("session:error", { message: "Only facilitator can close" });
        return;
      }
      io.to(session.id).emit("session:closed", { sessionId: session.id });
      deletePokerSession(session.id);
      for (const p of session.participants) {
        const s = io.sockets.sockets.get(p.socketId);
        s?.leave(session.id);
      }
    });

    socket.on("disconnect", () => {
      void disconnectSocket(io, socket);
    });
  });
}

function joinSocketToSession(
  io: Server,
  socket: Socket,
  session: PokerSession,
  meta: { memberId: string; memberName: string; avatarColor: string }
): void {
  const { memberId, memberName, avatarColor } = meta;
  socket.data = { ...socket.data, memberId };
  socket.join(session.id);

  const existingIdx = session.participants.findIndex((p) => p.socketId === socket.id);
  if (existingIdx >= 0) {
    session.participants.splice(existingIdx, 1);
  }
  const sameMemberIdx = session.participants.findIndex((p) => p.memberId === memberId);
  if (sameMemberIdx >= 0) {
    const old = session.participants[sameMemberIdx]!;
    const oldSocket = io.sockets.sockets.get(old.socketId);
    oldSocket?.leave(session.id);
    session.participants.splice(sameMemberIdx, 1);
  }

  const participant: PokerParticipant = {
    socketId: socket.id,
    memberId,
    memberName,
    avatarColor,
    vote: session.votes[memberId] ?? null
  };
  session.participants.push(participant);

  if (!session.facilitatorSocketId && memberId === session.facilitatorMemberId) {
    session.facilitatorSocketId = socket.id;
  }

  if (session.phase === "waiting" && session.currentStoryId) {
    session.phase = "voting";
  }

  syncParticipantVotes(session);
  setPokerSession(session);
  broadcastSession(io, session);
}

function disconnectSocket(io: Server, socket: Socket): void {
  for (const session of getAllPokerSessions()) {
    const idx = session.participants.findIndex((p) => p.socketId === socket.id);
    if (idx < 0) continue;
    const wasFacilitator = session.facilitatorSocketId === socket.id;
    session.participants.splice(idx, 1);
    socket.leave(session.id);
    if (session.participants.length === 0) {
      deletePokerSession(session.id);
      continue;
    }
    if (wasFacilitator) {
      pickNextFacilitator(session);
    }
    syncParticipantVotes(session);
    setPokerSession(session);
    broadcastSession(io, session);
  }
}
