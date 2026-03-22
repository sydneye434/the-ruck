// Developed by Sydney Edwards
import { Router } from "express";
import { createPokerSession, getPokerSession } from "../poker/sessionStore";
import { cloneSessionForViewer } from "../poker/serialize";
import { HttpError } from "../utils/httpError";
import { sendSuccess } from "../utils/envelope";
import { asyncHandler } from "../utils/asyncHandler";
import { getJsonBody } from "../utils/jsonBody";

export const pokerRoutes = Router();

pokerRoutes.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const input = getJsonBody(req);
    if (input.sprintId == null || !Array.isArray(input.storyQueue) || input.memberId == null) {
      throw new HttpError({
        statusCode: 400,
        code: "INVALID_REQUEST",
        message: "sprintId, storyQueue, and memberId are required"
      });
    }
    const session = createPokerSession({
      sprintId: String(input.sprintId),
      storyQueue: input.storyQueue.map((x: unknown) => String(x)),
      facilitatorMemberId: String(input.memberId)
    });
    return sendSuccess(res, { sessionId: session.id }, { location: `/api/poker/sessions/${session.id}` }, 201);
  })
);

pokerRoutes.get(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const session = getPokerSession(req.params.id);
    if (!session) {
      throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Session not found" });
    }
    const memberId = typeof req.query.memberId === "string" ? req.query.memberId : null;
    const data = cloneSessionForViewer(session, memberId);
    return sendSuccess(res, { ...data, isFacilitator: false });
  })
);
