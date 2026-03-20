// Developed by Sydney Edwards
import { hierarchy, tree, type HierarchyPointLink, type HierarchyPointNode } from "d3-hierarchy";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Team, TeamMember, TeamMemberLink, TeamTreeNode, TeamWithDepth } from "@the-ruck/shared";
import { api, ApiClientError } from "../../lib/api";
import { buildTeamTree } from "../../lib/buildTeamTree";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { useToast } from "../../components/feedback/ToastProvider";
import { TeamMemberDrawer, type TeamMemberFormInput } from "./TeamMemberDrawer";
import { TeamDetailDrawer } from "./TeamDetailDrawer";

function roleLabel(member: TeamMember) {
  if (member.roleType === "coordinator") return member.coordinatorTitle || "Coordinator";
  if (member.roleType === "scrum_master") return "Scrum Master";
  if (member.roleType === "product_owner") return "Product Owner";
  return "Team Member";
}

type ChartNodeDatum =
  | { kind: "team"; team: TeamTreeNode; members: TeamMember[]; children?: ChartNodeDatum[] }
  | { kind: "member"; member: TeamMember; teamId: string; children?: ChartNodeDatum[] };

function PlainTreePreview({
  nodes
}: {
  nodes: TeamTreeNode[];
}) {
  function render(node: TeamTreeNode) {
    return (
      <div key={node.id} className="space-y-1">
        <div className="flex items-center gap-2" style={{ marginLeft: `${node.depth * 18}px` }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: node.color }} />
          <span className="text-xs text-[var(--color-text-secondary)]">
            {node.name} (Level {node.depth})
          </span>
        </div>
        {node.children.map((child) => render(child))}
      </div>
    );
  }
  return <div className="space-y-1">{nodes.map((node) => render(node))}</div>;
}

export function OrgChartPage() {
  const toast = useToast();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [teams, setTeams] = useState<TeamWithDepth[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberships, setMemberships] = useState<TeamMemberLink[]>([]);
  const [scale, setScale] = useState(1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [teamDetailId, setTeamDetailId] = useState<string | null>(null);
  const [submittingMember, setSubmittingMember] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);

  async function load() {
    const [teamData, memberData, linkData] = await Promise.all([
      api.teams.getAll(),
      api.teamMembers.getAll(),
      api.teams.getMemberships()
    ]);
    setTeams(teamData);
    setMembers(memberData);
    setMemberships(linkData);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e instanceof ApiClientError ? e.message : "Failed to load org chart."));
  }, []);

  const byTeam = useMemo(() => {
    const map = new Map<string, TeamMember[]>();
    memberships.forEach((link) => {
      const member = members.find((m) => m.id === link.memberId);
      if (!member) return;
      const list = map.get(link.teamId) ?? [];
      list.push(member);
      map.set(link.teamId, list);
    });
    return map;
  }, [memberships, members]);

  const teamTree = useMemo(() => buildTeamTree(teams), [teams]);
  const unassignedMembers = useMemo(() => {
    const assigned = new Set(memberships.map((m) => m.memberId));
    return members.filter((m) => !assigned.has(m.id));
  }, [members, memberships]);

  const chartData = useMemo<ChartNodeDatum>(() => {
    const root: ChartNodeDatum = {
      kind: "team" as const,
      team: {
        id: "root",
        name: "Organization",
        description: "",
        parentTeamId: null,
        color: "var(--color-border)",
        depth: 0,
        children: teamTree
      },
      members: [] as TeamMember[],
      children: teamTree.map(function mapTeam(team): ChartNodeDatum {
        return {
          kind: "team" as const,
          team,
          members: byTeam.get(team.id) ?? [],
          children: [
            ...team.children.map(mapTeam),
            ...(byTeam.get(team.id) ?? []).map((member) => ({
              kind: "member" as const,
              member,
              teamId: team.id
            }))
          ]
        };
      })
    };
    return root;
  }, [byTeam, teamTree]);

  const layout = useMemo(() => {
    const h = hierarchy<ChartNodeDatum>(chartData, (d) => d.children ?? []);
    const root = tree<ChartNodeDatum>().nodeSize([250, 130])(h);
    return root;
  }, [chartData]);

  const nodes = layout.descendants() as Array<HierarchyPointNode<ChartNodeDatum>>;
  const links = layout.links() as Array<HierarchyPointLink<ChartNodeDatum>>;
  const width =
    Math.max(...nodes.map((n) => n.x), 0) -
    Math.min(...nodes.map((n) => n.x), 0) +
    700;
  const height = Math.max(...nodes.map((n) => n.y), 0) + 550;
  const minX = Math.min(...nodes.map((n) => n.x), 0) - 300;
  const minY = -120;

  const teamPosition = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      if (n.data.kind === "team" && n.data.team.id !== "root") {
        map.set(n.data.team.id, { x: n.x, y: n.y });
      }
    });
    return map;
  }, [nodes]);

  const coordinatorNodes = useMemo(() => {
    return members
      .filter((m) => m.roleType === "coordinator" && (m.coordinatorTeamIds?.length ?? 0) > 0)
      .map((m, idx) => {
        const targets = (m.coordinatorTeamIds ?? [])
          .map((id) => teamPosition.get(id))
          .filter(Boolean) as { x: number; y: number }[];
        if (targets.length === 0) return null;
        const avgX = targets.reduce((sum, t) => sum + t.x, 0) / targets.length;
        const minTargetY = Math.min(...targets.map((t) => t.y));
        return {
          member: m,
          x: avgX,
          y: minTargetY - 90 - idx * 12,
          targets
        };
      })
      .filter(Boolean) as Array<{
      member: TeamMember;
      x: number;
      y: number;
      targets: { x: number; y: number }[];
    }>;
  }, [members, teamPosition]);

  const teamDetail = teams.find((t) => t.id === teamDetailId) ?? null;

  async function updateMember(input: TeamMemberFormInput) {
    if (!editingMember) return;
    setSubmittingMember(true);
    try {
      await api.teamMembers.update(editingMember.id, {
        name: input.name,
        roleType: input.roleType,
        coordinatorTitle: input.coordinatorTitle || undefined,
        defaultAvailabilityDays: input.defaultAvailabilityDays,
        capacityMultiplier: input.capacityMultiplier,
        coordinatorTeamIds: input.coordinatorTeamIds,
        avatar: {
          color: input.avatarColor,
          initials: input.name
            .split(" ")
            .map((x) => x[0] ?? "")
            .join("")
            .slice(0, 2)
            .toUpperCase()
        }
      });
      toast.success("Member updated.");
      setEditingMember(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to update member.");
    } finally {
      setSubmittingMember(false);
    }
  }

  function exportPng() {
    if (!chartRef.current) return;
    const width = chartRef.current.scrollWidth;
    const height = chartRef.current.scrollHeight;
    const serialized = new XMLSerializer().serializeToString(chartRef.current);
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          ${serialized}
        </foreignObject>
      </svg>
    `;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = png;
        a.download = "the-ruck-org-chart.png";
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Org Chart"
        subtitle="Recursive team hierarchy with member and coordinator overlays."
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/team"
              className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              Back to Team
            </Link>
            <button type="button" onClick={() => setScale((s) => Math.max(0.4, s - 0.1))} className="border border-[var(--color-border)] px-2 py-2">-</button>
            <button type="button" onClick={() => setScale((s) => Math.min(2, s + 0.1))} className="border border-[var(--color-border)] px-2 py-2">+</button>
            <button type="button" onClick={() => setScale(1)} className="border border-[var(--color-border)] px-3 py-2 text-sm">
              Reset zoom
            </button>
            <button type="button" onClick={exportPng} className="border border-[var(--color-border)] px-3 py-2 text-sm">
              Export as PNG
            </button>
          </div>
        }
      />

      <Card padding="md">
        <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Tree Sanity Preview (CSS/Flex)</h3>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
          This plain recursive renderer validates hierarchy correctness before d3 coordinate placement.
        </p>
        <PlainTreePreview nodes={teamTree} />
      </Card>

      <Card padding="sm" className="relative h-[78vh] overflow-auto">
        <div
          ref={chartRef}
          className="relative"
          style={{ width: Math.max(width * scale, 1200), height: Math.max(height * scale, 700) }}
        >
          <svg className="absolute inset-0" width="100%" height="100%">
            <g transform={`translate(${(-minX + 120) * scale}, ${(-minY + 80) * scale}) scale(${scale})`}>
              {links.map((link, i) => (
                link.target.data.kind === "team" || link.target.data.kind === "member" ? (
                <path
                  key={`link-${i}`}
                  d={`M${link.source.x},${link.source.y + 20} C${link.source.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${link.target.y - 20}`}
                  fill="none"
                  stroke="var(--color-border)"
                />
                ) : null
              ))}

              {coordinatorNodes.map((node) =>
                node.targets.map((target, idx) => (
                  <path
                    key={`coord-${node.member.id}-${idx}`}
                    d={`M${node.x},${node.y + 12} C${node.x},${(node.y + target.y) / 2} ${target.x},${(node.y + target.y) / 2} ${target.x},${target.y - 24}`}
                    fill="none"
                    stroke="var(--color-role-coordinator)"
                    strokeDasharray="6,4"
                  />
                ))
              )}
            </g>
          </svg>

          <div className="absolute inset-0">
            <div
              className="absolute"
              style={{
                transform: `translate(${(-minX + 120) * scale}px, ${(-minY + 80) * scale}px) scale(${scale})`,
                transformOrigin: "top left"
              }}
            >
              {coordinatorNodes.map((node) => (
                <button
                  key={`coordinator-node-${node.member.id}`}
                  type="button"
                  onMouseEnter={() =>
                    setTooltip({
                      x: node.x,
                      y: node.y,
                      text: `${node.member.name} (${roleLabel(node.member)})`
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => setEditingMember(node.member)}
                  className="absolute flex h-9 w-32 items-center border border-[var(--color-role-coordinator)] bg-[var(--color-bg-secondary)] px-2 text-xs text-[var(--color-text-primary)]"
                  style={{ left: node.x - 64, top: node.y - 18 }}
                >
                  {node.member.coordinatorTitle || "Coordinator"}
                </button>
              ))}

              {nodes.map((node, idx) => {
                if (node.data.kind === "team") {
                  const teamNode = node.data;
                  if (teamNode.team.id === "root") return null;
                  const depthShade = Math.max(0, 100 - teamNode.team.depth * 8);
                  return (
                    <button
                      type="button"
                      key={`team-node-${idx}`}
                      onMouseEnter={() => {
                        const chain = teams
                          .filter((t) => t.id === teamNode.team.id || t.id === teamNode.team.parentTeamId)
                          .map((t) => t.name)
                          .join(" -> ");
                        setTooltip({
                          x: node.x,
                          y: node.y,
                          text: `${teamNode.team.name} | depth ${teamNode.team.depth} | parent chain ${chain || "root"}`
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => setTeamDetailId(teamNode.team.id)}
                      className="absolute flex h-[42px] w-[172px] items-center border border-[var(--color-border)] text-left"
                      style={{
                        left: node.x - 86,
                        top: node.y - 20,
                        background: `color-mix(in srgb, var(--color-bg-secondary) ${depthShade}%, var(--color-bg-primary))`
                      }}
                    >
                      <span className="h-full w-[6px]" style={{ background: teamNode.team.color }} />
                      <span className="ml-2 flex flex-col">
                        <span className="text-xs text-[var(--color-text-primary)]">{teamNode.team.name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {(byTeam.get(teamNode.team.id) ?? []).length} members
                        </span>
                      </span>
                    </button>
                  );
                }

                const member = node.data.member;
                return (
                  <button
                    type="button"
                    key={`member-node-${idx}`}
                    onMouseEnter={() =>
                      setTooltip({
                        x: node.x,
                        y: node.y,
                        text: `${member.name} | ${roleLabel(member)} | ${Math.round(
                          member.defaultAvailabilityDays * ((member.capacityMultiplier ?? 100) / 100)
                        )} effective days`
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => setEditingMember(member)}
                    className="absolute flex w-[180px] items-center gap-2 text-left"
                    style={{ left: node.x - 52, top: node.y - 12 }}
                  >
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] text-[10px] text-[var(--color-text-primary)]"
                      style={{ background: member.avatar.color }}
                    >
                      {member.avatar.initials}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[11px] text-[var(--color-text-primary)]">{member.name}</span>
                      <span className="truncate text-[10px] text-[var(--color-text-muted)]">{roleLabel(member)}</span>
                      {(member.capacityMultiplier ?? 100) < 100 ? (
                        <span className="text-[10px] text-[var(--color-warning)]">{member.capacityMultiplier}% capacity</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 h-28 w-40 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[10px] text-[var(--color-text-muted)]">
          <div>Minimap</div>
          <svg width="100%" height="90%">
            <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="var(--color-border)" />
            <rect x="18%" y="22%" width="48%" height="46%" fill="none" stroke="var(--color-accent)" />
          </svg>
        </div>
      </Card>

      <Card padding="md">
        <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Unassigned Members</h3>
        <div className="mt-2 space-y-2">
          {(["team_member", "scrum_master", "product_owner", "coordinator"] as const).map((role) => {
            const group = unassignedMembers.filter((member) => member.roleType === role);
            if (group.length === 0) return null;
            return (
              <div key={role} className="border-t border-[var(--color-border)] pt-2">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{role.replaceAll("_", " ")}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {group.map((member) => (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => setEditingMember(member)}
                      className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-[60] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
          style={{ left: tooltip.x * scale + 40, top: tooltip.y * scale + 120 }}
        >
          {tooltip.text}
        </div>
      ) : null}

      <TeamMemberDrawer
        open={Boolean(editingMember)}
        member={editingMember}
        teams={teams}
        submitting={submittingMember}
        onClose={() => setEditingMember(null)}
        onSubmit={updateMember}
      />

      <TeamDetailDrawer
        open={Boolean(teamDetail)}
        team={teamDetail}
        teams={teams}
        members={members}
        memberships={memberships}
        saving={teamSaving}
        onClose={() => setTeamDetailId(null)}
        onUpdateTeam={async (patch) => {
          if (!teamDetail) return;
          setTeamSaving(true);
          try {
            await api.teams.update(teamDetail.id, patch);
            await load();
          } finally {
            setTeamSaving(false);
          }
        }}
        onAddMember={async (memberId) => {
          if (!teamDetail) return;
          await api.teams.addMember(teamDetail.id, memberId);
          await load();
        }}
        onRemoveMember={async (memberId) => {
          if (!teamDetail) return;
          await api.teams.removeMember(teamDetail.id, memberId);
          await load();
        }}
      />
    </div>
  );
}

