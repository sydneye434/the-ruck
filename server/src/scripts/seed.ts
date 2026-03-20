import { promises as fs } from "node:fs";
import path from "node:path";
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

export async function clearDataDir() {
  const cwd = process.cwd();
  const dataDir = cwd.endsWith(`${path.sep}server`)
    ? path.join(cwd, "data")
    : path.join(cwd, "server", "data");
  await fs.mkdir(dataDir, { recursive: true });
  const entries = await fs.readdir(dataDir);
  await Promise.all(entries.map((name) => fs.rm(path.join(dataDir, name), { force: true })));
}

export async function runSeed() {
  await clearDataDir();

  const engineering = await teamsRepository.create({
    name: "Engineering",
    description: "Top-level engineering function",
    parentTeamId: null,
    color: "var(--color-team-1)"
  });
  const platform = await teamsRepository.create({
    name: "Platform",
    description: "Shared services and foundations",
    parentTeamId: engineering.id,
    color: "var(--color-team-2)"
  });
  const product = await teamsRepository.create({
    name: "Product",
    description: "Feature delivery teams",
    parentTeamId: engineering.id,
    color: "var(--color-team-3)"
  });
  const infra = await teamsRepository.create({
    name: "Infrastructure",
    description: "Cloud and reliability",
    parentTeamId: platform.id,
    color: "var(--color-team-4)"
  });
  const mobile = await teamsRepository.create({
    name: "Mobile",
    description: "iOS and Android experience",
    parentTeamId: product.id,
    color: "var(--color-team-5)"
  });
  const cloudOps = await teamsRepository.create({
    name: "Cloud Ops",
    description: "Runtime operations and cloud governance",
    parentTeamId: infra.id,
    color: "var(--color-team-6)"
  });

  const members = await Promise.all([
    teamMembersRepository.create({
      name: "Avery Kim",
      roleType: "scrum_master",
      avatar: { color: "var(--color-avatar-1)", initials: "AK" },
      defaultAvailabilityDays: 8,
      capacityMultiplier: 100,
      isActive: true
    }),
    teamMembersRepository.create({
      name: "Morgan Lee",
      roleType: "product_owner",
      avatar: { color: "var(--color-avatar-2)", initials: "ML" },
      defaultAvailabilityDays: 8,
      capacityMultiplier: 100,
      isActive: true
    }),
    teamMembersRepository.create({
      name: "Jordan Patel",
      roleType: "team_member",
      avatar: { color: "var(--color-avatar-3)", initials: "JP" },
      defaultAvailabilityDays: 8,
      capacityMultiplier: 50,
      isActive: true
    }),
    teamMembersRepository.create({
      name: "Riley Chen",
      roleType: "coordinator",
      coordinatorTitle: "SoSM",
      coordinatorTeamIds: [platform.id, product.id],
      avatar: { color: "var(--color-avatar-4)", initials: "RC" },
      defaultAvailabilityDays: 8,
      capacityMultiplier: 100,
      isActive: true
    }),
    teamMembersRepository.create({
      name: "Parker Diaz",
      roleType: "coordinator",
      coordinatorTitle: "SoSoSM",
      coordinatorTeamIds: [engineering.id],
      avatar: { color: "var(--color-avatar-5)", initials: "PD" },
      defaultAvailabilityDays: 8,
      capacityMultiplier: 100,
      isActive: true
    })
  ]);

  const [avery, morgan, jordan, riley, parker] = members;

  await Promise.all([
    teamMemberLinksRepository.create({ teamId: engineering.id, memberId: parker.id, joinedAt: new Date().toISOString() }),
    teamMemberLinksRepository.create({ teamId: platform.id, memberId: avery.id, joinedAt: new Date().toISOString() }),
    teamMemberLinksRepository.create({ teamId: product.id, memberId: morgan.id, joinedAt: new Date().toISOString() }),
    teamMemberLinksRepository.create({ teamId: infra.id, memberId: jordan.id, joinedAt: new Date().toISOString() }),
    teamMemberLinksRepository.create({ teamId: cloudOps.id, memberId: jordan.id, joinedAt: new Date().toISOString() }),
    teamMemberLinksRepository.create({ teamId: mobile.id, memberId: jordan.id, joinedAt: new Date().toISOString() }),
    teamMemberLinksRepository.create({ teamId: engineering.id, memberId: riley.id, joinedAt: new Date().toISOString() })
  ]);

  await settingsRepository.getOrCreateDefault();

  const now = Date.now();
  const sprint3 = await sprintsRepository.create({
    name: "Sprint 3",
    startDate: new Date(now - 42 * 86400000).toISOString(),
    endDate: new Date(now - 28 * 86400000).toISOString(),
    goal: "Improve deployment confidence",
    status: "completed",
    completedAt: new Date(now - 28 * 86400000).toISOString(),
    velocityDataPoint: 34
  });
  const activeSprint = await sprintsRepository.create({
    name: "Sprint 4",
    startDate: new Date(now - 2 * 86400000).toISOString(),
    endDate: new Date(now + 11 * 86400000).toISOString(),
    goal: "Ship retrospective workflow foundations",
    status: "active"
  });
  const sprint2 = await sprintsRepository.create({
    name: "Sprint 2",
    startDate: new Date(now - 56 * 86400000).toISOString(),
    endDate: new Date(now - 43 * 86400000).toISOString(),
    goal: "Stabilize board workflows",
    status: "completed",
    completedAt: new Date(now - 43 * 86400000).toISOString(),
    velocityDataPoint: 21
  });

  const retroCompleted = await retrosRepository.create({
    sprintId: sprint3.id,
    title: "Sprint 3 Retrospective",
    template: "start_stop_continue",
    phase: "action_items",
    isAnonymous: false
  });
  const retroActive = await retrosRepository.create({
    sprintId: activeSprint.id,
    title: "Sprint 4 Retrospective",
    template: "mad_sad_glad",
    phase: "reflect",
    isAnonymous: false
  });

  const completedCards = await Promise.all([
    retroCardsRepository.create({
      retroId: retroCompleted.id,
      columnKey: "start",
      authorId: avery.id,
      content: "Start pairing on story slicing before sprint planning.",
      upvotes: [],
      groupId: null
    }),
    retroCardsRepository.create({
      retroId: retroCompleted.id,
      columnKey: "start",
      authorId: morgan.id,
      content: "Start adding release notes earlier in the sprint.",
      upvotes: [],
      groupId: null
    }),
    retroCardsRepository.create({
      retroId: retroCompleted.id,
      columnKey: "stop",
      authorId: jordan.id,
      content: "Stop carrying stories without clear acceptance criteria.",
      upvotes: [],
      groupId: null
    }),
    retroCardsRepository.create({
      retroId: retroCompleted.id,
      columnKey: "stop",
      authorId: riley.id,
      content: "Stop waiting until the last day to run integration tests.",
      upvotes: [],
      groupId: null
    }),
    retroCardsRepository.create({
      retroId: retroCompleted.id,
      columnKey: "continue",
      authorId: parker.id,
      content: "Continue daily risk call-outs in standup.",
      upvotes: [],
      groupId: null
    }),
    retroCardsRepository.create({
      retroId: retroCompleted.id,
      columnKey: "continue",
      authorId: avery.id,
      content: "Continue using swarm sessions for review bottlenecks.",
      upvotes: [],
      groupId: null
    })
  ]);
  await retroCardsRepository.update(completedCards[0].id, {
    upvotes: [morgan.id, jordan.id]
  });

  const completedOpenItem = await retroActionItemsRepository.create({
    retroId: retroCompleted.id,
    sprintId: sprint3.id,
    description: "Create CI checklist template for release readiness.",
    ownerId: avery.id,
    dueDate: new Date(now - 7 * 86400000).toISOString(),
    status: "open",
    carriedOverFromId: null
  });
  await retroActionItemsRepository.create({
    retroId: retroCompleted.id,
    sprintId: sprint3.id,
    description: "Document flaky test ownership and triage flow.",
    ownerId: riley.id,
    dueDate: new Date(now - 10 * 86400000).toISOString(),
    status: "complete",
    carriedOverFromId: null
  });

  await Promise.all([
    retroCardsRepository.create({
      retroId: retroActive.id,
      columnKey: "mad",
      authorId: jordan.id,
      content: "Build broke after dependency drift.",
      upvotes: [],
      groupId: null,
      createdAt: new Date(now - 36 * 3600000).toISOString(),
      updatedAt: new Date(now - 36 * 3600000).toISOString()
    } as any),
    retroCardsRepository.create({
      retroId: retroActive.id,
      columnKey: "sad",
      authorId: morgan.id,
      content: "Story kickoff had unclear owner handoff.",
      upvotes: [],
      groupId: null,
      createdAt: new Date(now - 18 * 3600000).toISOString(),
      updatedAt: new Date(now - 18 * 3600000).toISOString()
    } as any),
    retroCardsRepository.create({
      retroId: retroActive.id,
      columnKey: "glad",
      authorId: avery.id,
      content: "Cross-team review pairing reduced review cycle time.",
      upvotes: [],
      groupId: null,
      createdAt: new Date(now - 8 * 3600000).toISOString(),
      updatedAt: new Date(now - 8 * 3600000).toISOString()
    } as any),
    retroCardsRepository.create({
      retroId: retroActive.id,
      columnKey: "glad",
      authorId: parker.id,
      content: "Shared checklist caught release risk early.",
      upvotes: [],
      groupId: null
    })
  ]);
  await retroActionItemsRepository.create({
    retroId: retroActive.id,
    sprintId: activeSprint.id,
    description: "Carry over CI checklist adoption to all feature squads.",
    ownerId: avery.id,
    dueDate: new Date(now + 5 * 86400000).toISOString(),
    status: "open",
    carriedOverFromId: completedOpenItem.id
  });

  await storiesRepository.create({
    sprintId: activeSprint.id,
    title: "Seed Story",
    description: "Generated by seed script",
    storyPoints: 3,
    assigneeMemberId: jordan.id,
    labels: ["seed"],
    acceptanceCriteria: ["Runs locally"],
    boardColumn: "backlog"
  });

  const activityBase = now - 3 * 86400000;
  await activityLogRepository.create({
    type: "story_created",
    description: `Story 'Seed Story' added to ${activeSprint.name}`,
    actorId: jordan.id,
    metadata: { sprintId: activeSprint.id },
    createdAt: new Date(activityBase + 1 * 60000).toISOString()
  });
  await activityLogRepository.create({
    type: "retro_card_added",
    description: `Card added to start in ${sprint3.name} retrospective`,
    actorId: avery.id,
    metadata: { retroId: retroCompleted.id, sprintId: sprint3.id, columnKey: "start" },
    createdAt: new Date(activityBase + 2 * 60000).toISOString()
  });
  await activityLogRepository.create({
    type: "sprint_completed",
    description: `Sprint '${sprint2.name}' completed with ${sprint2.velocityDataPoint} points`,
    actorId: null,
    metadata: { sprintId: sprint2.id, velocityDataPoint: sprint2.velocityDataPoint },
    createdAt: new Date(activityBase + 3 * 60000).toISOString()
  });
  await activityLogRepository.create({
    type: "story_moved",
    description: "Story 'Seed Story' moved to done",
    actorId: jordan.id,
    metadata: { sprintId: activeSprint.id, boardColumn: "done" },
    createdAt: new Date(activityBase + 4 * 60000).toISOString()
  });
  await activityLogRepository.create({
    type: "action_item_completed",
    description: "Action item 'Document flaky test ownership and triage flow.' marked complete",
    actorId: riley.id,
    metadata: { retroId: retroCompleted.id, sprintId: sprint3.id },
    createdAt: new Date(activityBase + 5 * 60000).toISOString()
  });
  await activityLogRepository.create({
    type: "story_created",
    description: "Story 'Capacity panel polish' added to Backlog",
    actorId: morgan.id,
    metadata: { sprintId: activeSprint.id },
    createdAt: new Date(activityBase + 6 * 60000).toISOString()
  });
  await activityLogRepository.create({
    type: "retro_card_added",
    description: `Card added to glad in ${activeSprint.name} retrospective`,
    actorId: parker.id,
    metadata: { retroId: retroActive.id, sprintId: activeSprint.id, columnKey: "glad" },
    createdAt: new Date(activityBase + 7 * 60000).toISOString()
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete: teams, members, hierarchy, sprint + retros sample data created.");
}

const isDirectRun = Boolean(process.argv[1] && path.basename(process.argv[1]).startsWith("seed."));
if (isDirectRun) {
  runSeed().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

