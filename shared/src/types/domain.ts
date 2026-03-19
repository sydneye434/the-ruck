export type ISODateString = string;

export type TeamRole =
  | "Scrum Master"
  | "Product Owner"
  | "Developer"
  | "Designer"
  | "QA"
  | "Other";

export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13;

export type StoryBoardColumn = "backlog" | "in_progress" | "in_review" | "done";

export type SprintStatus = "active" | "completed";

export type RetroPhase = "reflect" | "discuss" | "action_items";

export type RetroTemplate =
  | "start_stop_continue"
  | "four_ls"
  | "mad_sad_glad"
  | "custom";

export type Identifiable = { id: string };

export type Avatar = {
  color: string; // hex, e.g. "#FF3B30"
  initials: string; // e.g. "AE"
};

export type TeamMember = Identifiable & {
  name: string;
  role: TeamRole;
  avatar: Avatar;
  defaultAvailabilityDays: number; // typical available working days per sprint
  isActive: boolean; // active/inactive without deletion
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type Sprint = Identifiable & {
  name: string;
  startDate: ISODateString;
  endDate: ISODateString;
  goal: string;
  status: SprintStatus;
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
  template: RetroTemplate;
  isInProgress: boolean;
  // When true, hide author names on cards.
  areCardsAnonymous: boolean;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type RetroCard = Identifiable & {
  retroId: string;
  phase: RetroPhase;
  content: string;
  authorMemberId: string;
  upvotes: number;
  // Placeholder for future clustering logic; kept simple for now.
  clusterKey?: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type RetroActionItem = Identifiable & {
  retroId: string;
  description: string;
  ownerMemberId: string;
  dueDate: ISODateString;
  isCompleted: boolean;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type AppSettings = Identifiable & {
  // Default sprint length in working days (not calendar days).
  sprintLengthDefaultDays: number;
  // Velocity history window for capacity calculator.
  velocityWindowN: 1 | 2 | 3 | 5;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

