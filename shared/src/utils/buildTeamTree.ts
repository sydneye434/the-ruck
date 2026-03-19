import type { Team, TeamTreeNode, TeamWithDepth } from "../types/domain";

function computeDepth(
  team: Team,
  byId: Map<string, Team>,
  cache: Map<string, number>,
  seen: Set<string>
): number {
  if (cache.has(team.id)) return cache.get(team.id)!;
  if (!team.parentTeamId) {
    cache.set(team.id, 0);
    return 0;
  }
  if (seen.has(team.id)) {
    // Break cycles defensively for rendering utilities.
    return 0;
  }
  const parent = byId.get(team.parentTeamId);
  if (!parent) {
    cache.set(team.id, 0);
    return 0;
  }
  seen.add(team.id);
  const depth = computeDepth(parent, byId, cache, seen) + 1;
  cache.set(team.id, depth);
  seen.delete(team.id);
  return depth;
}

export function withComputedDepth(teams: Team[]): TeamWithDepth[] {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const cache = new Map<string, number>();
  return teams.map((team) => ({
    ...team,
    depth: computeDepth(team, byId, cache, new Set())
  }));
}

export function buildTeamTree(teams: Team[]): TeamTreeNode[] {
  const enriched = withComputedDepth(teams);
  const nodesById = new Map<string, TeamTreeNode>();
  const roots: TeamTreeNode[] = [];

  enriched.forEach((team) => {
    nodesById.set(team.id, { ...team, children: [] });
  });

  nodesById.forEach((node) => {
    if (!node.parentTeamId) {
      roots.push(node);
      return;
    }
    const parent = nodesById.get(node.parentTeamId);
    if (!parent) {
      roots.push(node);
      return;
    }
    parent.children.push(node);
  });

  return roots;
}

