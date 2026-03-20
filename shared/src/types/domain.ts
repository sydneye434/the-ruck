// Developed by Sydney Edwards
export type ISODateString = string;

export type TeamRoleType =
  | "team_member"
  | "scrum_master"
  | "product_owner"
  | "coordinator";

export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13;

export type StoryBoardColumn = "backlog" | "in_progress" | "in_review" | "done";

export type SprintStatus = "planning" | "active" | "completed";

export type RetroPhase = "reflect" | "discuss" | "action_items" | "closed";

export type RetroTemplate =
  | "start_stop_continue"
  | "4ls"
  | "mad_sad_glad";

export type Identifiable = { id: string };

export type Avatar = {
  color: string; // hex, e.g. "#FF3B30"
  initials: string; // e.g. "AE"
};

export type TeamMember = Identifiable & {
  name: string;
  roleType: TeamRoleType;
  coordinatorTitle?: string;
  avatar: Avatar;
  defaultAvailabilityDays: number; // typical available working days per sprint
  capacityMultiplier: number; // 1..100 percent
  isActive: boolean; // active/inactive without deletion
  // Optional for cross-team coordinator connectors in org chart.
  coordinatorTeamIds?: string[];
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type Team = Identifiable & {
  name: string;
  description?: string;
  parentTeamId: string | null;
  color: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type TeamWithDepth = Team & {
  depth: number;
};

export type TeamTreeNode = TeamWithDepth & {
  children: TeamTreeNode[];
};

export type TeamMemberLink = Identifiable & {
  teamId: string;
  memberId: string;
  joinedAt: ISODateString;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type Sprint = Identifiable & {
  name: string;
  startDate: ISODateString;
  endDate: ISODateString;
  goal: string;
  status: SprintStatus;
  capacityTarget?: number | null;
  capacitySnapshot?: unknown;
  completedAt?: ISODateString;
  // Stored when the sprint is completed (sum of "done" story points for that sprint).
  velocityDataPoint?: number;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type Story = Identifiable & {
  sprintId: string;
  title: string;
  description: string;
  storyPoints: StoryPoints;
  assigneeMemberId: string | null;
  labels: string[];
  acceptanceCriteria: string[];
  boardColumn: StoryBoardColumn;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type Retro = Identifiable & {
  sprintId: string;
  title: string;
  template: RetroTemplate;
  phase: RetroPhase;
  isAnonymous: boolean;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type RetroCard = Identifiable & {
  retroId: string;
  columnKey: string;
  authorId: string;
  content: string;
  upvotes: string[];
  groupId?: string | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type RetroActionItem = Identifiable & {
  retroId: string;
  sprintId: string;
  description: string;
  ownerId: string | null;
  dueDate?: ISODateString | null;
  status: "open" | "in_progress" | "complete";
  carriedOverFromId?: string | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type AppSettings = Identifiable & {
  sprintLengthDays: number;
  velocityWindow: 1 | 2 | 3 | 5;
  storyPointScale: "fibonacci" | "tshirt";
  defaultRetroTemplate: "start_stop_continue" | "4ls" | "mad_sad_glad";
  defaultAnonymous: boolean;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type ActivityLog = Identifiable & {
  type:
    | "story_moved"
    | "story_created"
    | "sprint_completed"
    | "retro_card_added"
    | "action_item_completed";
  description: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: ISODateString;
};

