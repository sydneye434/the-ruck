import { Router } from "express";
import {
  activityLogRepository,
  retroActionItemsRepository,
  retroCardsRepository,
  retrosRepository,
  settingsRepository,
  sprintsRepository,
  storiesRepository,
  teamMemberLinksRepository,
  teamMembersRepository,
  teamsRepository
} from "../repositories";
import { sendSuccess } from "../utils/envelope";
import { clearDataDir, runSeed } from "../scripts/seed";

export const dataManagementRoutes = Router();

dataManagementRoutes.get("/export", async (_req, res) => {
  const [
    settings,
    teamMembers,
    teams,
    sprints,
    stories,
    retros,
    retroCards,
    actionItems,
    activityLog
  ] = await Promise.all([
    settingsRepository.getOrCreateDefault(),
    teamMembersRepository.getAll(),
    teamsRepository.getAll(),
    sprintsRepository.getAll(),
    storiesRepository.getAll(),
    retrosRepository.getAll(),
    retroCardsRepository.getAll(),
    retroActionItemsRepository.getAll(),
    activityLogRepository.getAll()
  ]);

  return sendSuccess(res, {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    data: {
      settings,
      teamMembers,
      teams,
      sprints,
      stories,
      retros,
      retroCards,
      actionItems,
      activityLog
    }
  });
});

dataManagementRoutes.delete("/reset", async (_req, res) => {
  await clearDataDir();
  await runSeed();
  return sendSuccess(res, { message: "Reset complete" });
});
