import type {
  ApiResponse,
  AppSettings,
  Retro,
  RetroActionItem,
  RetroCard,
  Sprint,
  Story,
  Team,
  TeamMember,
  TeamMemberLink,
  TeamTreeNode,
  TeamWithDepth
} from "@the-ruck/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";
type TeamMemberPatch = Partial<TeamMember> & { active?: boolean };

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, params?: QueryParams) {
  if (!params) return path;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}`.length > 0) query.set(k, String(v));
  });
  const q = query.toString();
  return q ? `${path}?${q}` : path;
}

class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });

  const envelope = (await response.json()) as ApiResponse<T>;

  if (envelope.error) {
    throw new ApiClientError(envelope.error.message, envelope.error.code ?? "API_ERROR", response.status);
  }

  return envelope.data as T;
}

async function del(path: string) {
  return request<null>(path, { method: "DELETE" });
}

export const api = {
  teamMembers: {
    getAll: () => request<TeamMember[]>("/team-members"),
    getById: (id: string) => request<TeamMember>(`/team-members/${id}`),
    create: (payload: Partial<TeamMember>) =>
      request<TeamMember>("/team-members", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: TeamMemberPatch) =>
      request<TeamMember>(`/team-members/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    deactivate: (id: string) =>
      request<TeamMember>(`/team-members/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: false })
      }),
    reactivate: (id: string) =>
      request<TeamMember>(`/team-members/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: true })
      }),
    delete: (id: string) => del(`/team-members/${id}`)
  },
  teams: {
    getAll: () => request<TeamWithDepth[]>("/teams"),
    getTree: () => request<TeamTreeNode[]>("/teams/tree"),
    getMemberships: () => request<TeamMemberLink[]>("/teams/memberships"),
    getMembersForTeam: (teamId: string) => request<TeamMemberLink[]>(`/teams/${teamId}/members`),
    create: (payload: Partial<Team>) =>
      request<Team>("/teams", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Team>) =>
      request<Team>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    delete: (id: string, mode: "single" | "cascade" = "single") =>
      del(`/teams/${id}?mode=${mode}`),
    addMember: (teamId: string, memberId: string) =>
      request<TeamMemberLink>(`/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ memberId })
      }),
    removeMember: (teamId: string, memberId: string) =>
      del(`/teams/${teamId}/members/${memberId}`)
  },
  sprints: {
    getAll: () => request<Sprint[]>("/sprints"),
    getById: (id: string) => request<Sprint>(`/sprints/${id}`),
    create: (payload: Partial<Sprint>) =>
      request<Sprint>("/sprints", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Sprint>) =>
      request<Sprint>(`/sprints/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    getCapacityContext: (id: string) =>
      request<{
        sprint: {
          id: string;
          name: string;
          goal: string;
          startDate: string;
          endDate: string;
          capacityTarget: number | null;
          capacitySnapshot: unknown;
        };
        completedSprints: Array<{
          id: string;
          name: string;
          completedAt: string;
          velocityDataPoint: number;
        }>;
        activeMembers: Array<{
          id: string;
          name: string;
          roleType: "team_member" | "scrum_master" | "product_owner" | "coordinator";
          coordinatorTitle?: string;
          avatar: { color: string; initials: string };
          defaultAvailabilityDays: number;
          capacityMultiplier: number;
          effectiveDays: number;
        }>;
        teams: Array<{
          id: string;
          name: string;
          description?: string;
          parentTeamId: string | null;
          color: string;
          depth?: number;
        }>;
        memberships: Array<{
          id: string;
          teamId: string;
          memberId: string;
          joinedAt: string;
        }>;
        workingDaysInSprint: number;
      }>(`/sprints/${id}/capacity-context`),
    complete: (id: string) => request<Sprint>(`/sprints/${id}/complete`, { method: "POST" }),
    delete: (id: string) => del(`/sprints/${id}`)
  },
  stories: {
    getAll: (params?: { sprintId?: string }) => request<Story[]>(withQuery("/stories", params)),
    getById: (id: string) => request<Story>(`/stories/${id}`),
    create: (payload: Partial<Story>) =>
      request<Story>("/stories", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Story>) =>
      request<Story>(`/stories/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    delete: (id: string) => del(`/stories/${id}`)
  },
  retros: {
    getAll: () => request<Retro[]>("/retros"),
    getById: (id: string) => request<Retro>(`/retros/${id}`),
    create: (payload: Partial<Retro>) =>
      request<Retro>("/retros", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Retro>) =>
      request<Retro>(`/retros/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    delete: (id: string) => del(`/retros/${id}`),
    cards: {
      getAll: (retroId: string) => request<RetroCard[]>(`/retros/${retroId}/cards`),
      getById: (retroId: string, cardId: string) => request<RetroCard>(`/retros/${retroId}/cards/${cardId}`),
      create: (retroId: string, payload: Partial<RetroCard>) =>
        request<RetroCard>(`/retros/${retroId}/cards`, { method: "POST", body: JSON.stringify(payload) }),
      update: (retroId: string, cardId: string, payload: Partial<RetroCard>) =>
        request<RetroCard>(`/retros/${retroId}/cards/${cardId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        }),
      delete: (retroId: string, cardId: string) => del(`/retros/${retroId}/cards/${cardId}`)
    },
    actionItems: {
      getAll: (retroId: string) => request<RetroActionItem[]>(`/retros/${retroId}/action-items`),
      getById: (retroId: string, actionItemId: string) =>
        request<RetroActionItem>(`/retros/${retroId}/action-items/${actionItemId}`),
      create: (retroId: string, payload: Partial<RetroActionItem>) =>
        request<RetroActionItem>(`/retros/${retroId}/action-items`, {
          method: "POST",
          body: JSON.stringify(payload)
        }),
      update: (retroId: string, actionItemId: string, payload: Partial<RetroActionItem>) =>
        request<RetroActionItem>(`/retros/${retroId}/action-items/${actionItemId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        }),
      delete: (retroId: string, actionItemId: string) =>
        del(`/retros/${retroId}/action-items/${actionItemId}`)
    }
  },
  settings: {
    get: () => request<AppSettings>("/settings"),
    update: (payload: Partial<AppSettings>) =>
      request<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(payload) })
  }
};

export { ApiClientError };

