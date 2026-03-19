/**
 * Swappable data layer pattern:
 * - Import repositories from `server/src/repositories/*` (or from this index).
 * - Those repository modules are the ONLY files you should replace when migrating
 *   from the JSON persistence to Postgres/Prisma.
 * - The rest of the app should stay unaware of the underlying storage mechanism.
 */
export * from "./teamMembersRepository";
export * from "./sprintsRepository";
export * from "./storiesRepository";
export * from "./retrosRepository";
export * from "./retroCardsRepository";
export * from "./retroActionItemsRepository";
export * from "./settingsRepository";
export * from "./teamsRepository";
export * from "./teamMemberLinksRepository";

