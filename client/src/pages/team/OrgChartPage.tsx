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

type ChartNodeDatum =
  | { kind: "team"; team: TeamTreeNode; members: TeamMember[] }
  | { kind: "member"; member: TeamMember; teamId: string };

function roleLabel(member: TeamMember) {
  if (member.roleType === "coordinator") return member.coordinatorTitle || "Coordinator";
  if (member.roleType === "scrum_master") return "Scrum Master";
  if (member.roleType === "product_owner") return "Product Owner";
  return "Team Member";
}

export function OrgChartPage() {
  const toast = useToast();
  const svgRef = useRef<SVGSVGElement | null>(null);
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

  const chartData = useMemo(() => {
    const root = {
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
      children: teamTree.map(function mapTeam(team): any {
        return {
          kind: "team" as const,
          team,
          members: byTeam.get(team.id) ?? [],
          children: [
            ...(team.children.map(mapTeam) as any[]),
            ...((byTeam.get(team.id) ?? []).map((member) => ({
              kind: "member" as const,
              member,
              teamId: team.id
            })) as any[])
          ]
        };
      })
    };
    return root;
  }, [byTeam, teamTree]);

  const layout = useMemo(() => {
    const h = hierarchy<any>(chartData as any, (d: any) => d.children);
    const root = tree<any>().nodeSize([220, 120])(h);
    return root;
  }, [chartData]);

  const nodes = layout.descendants() as Array<HierarchyPointNode<any>>;
  const links = layout.links() as Array<HierarchyPointLink<any>>;
  const width = Math.max(...nodes.map((n: HierarchyPointNode<any>) => n.x), 0) - Math.min(...nodes.map((n: HierarchyPointNode<any>) => n.x), 0) + 600;
  const height = Math.max(...nodes.map((n: HierarchyPointNode<any>) => n.y), 0) + 500;
  const minX = Math.min(...nodes.map((n: HierarchyPointNode<any>) => n.x), 0) - 240;
  const minY = -120;

  const teamPosition = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n: HierarchyPointNode<any>) => {
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
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgRef.current?.clientWidth || 1600;
      canvas.height = svgRef.current?.clientHeight || 900;
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

      <Card padding="sm" className="relative h-[78vh] overflow-auto">
        <svg ref={svgRef} width={Math.max(width * scale, 1200)} height={Math.max(height * scale, 700)}>
          <g transform={`translate(${(-minX + 120) * scale}, ${(-minY + 80) * scale}) scale(${scale})`}>
            {links.map((link: HierarchyPointLink<any>, i: number) => (
              <path
                key={i}
                d={`M${link.source.x},${link.source.y + 20} C${link.source.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${(link.source.y + link.target.y) / 2} ${link.target.x},${link.target.y - 20}`}
                fill="none"
                stroke="var(--color-border)"
              />
            ))}

            {coordinatorNodes.map((node) => (
              <g key={node.member.id}>
                {node.targets.map((target, idx) => (
                  <path
                    key={idx}
                    d={`M${node.x},${node.y + 12} C${node.x},${(node.y + target.y) / 2} ${target.x},${(node.y + target.y) / 2} ${target.x},${target.y - 24}`}
                    fill="none"
                    stroke="var(--color-role-coordinator)"
                    strokeDasharray="6,4"
                  />
                ))}
                <g
                  transform={`translate(${node.x - 64}, ${node.y - 18})`}
                  onMouseEnter={() =>
                    setTooltip({
                      x: node.x,
                      y: node.y,
                      text: `${node.member.name} (${roleLabel(node.member)})`
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => setEditingMember(node.member)}
                >
                  <rect width="128" height="36" rx="4" fill="var(--color-bg-secondary)" stroke="var(--color-role-coordinator)" />
                  <text x="8" y="23" fill="var(--color-text-primary)" fontSize="12">
                    {node.member.coordinatorTitle || "Coordinator"}
                  </text>
                </g>
              </g>
            ))}

            {nodes.map((node: HierarchyPointNode<any>, idx: number) => {
              if (node.data.kind === "team") {
                if (node.data.team.id === "root") return null;
                const depthShade = Math.max(0, 100 - node.data.team.depth * 8);
                return (
                  <g
                    key={idx}
                    transform={`translate(${node.x - 86}, ${node.y - 20})`}
                    onMouseEnter={() => {
                      const chain = teams
                        .filter((t) => t.id === node.data.team.id || t.id === node.data.team.parentTeamId)
                        .map((t) => t.name)
                        .join(" -> ");
                      setTooltip({
                        x: node.x,
                        y: node.y,
                        text: `${node.data.team.name} | depth ${node.data.team.depth} | parent chain ${chain || "root"}`
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => setTeamDetailId(node.data.team.id)}
                  >
                    <rect
                      width="172"
                      height="42"
                      rx="6"
                      fill={`color-mix(in srgb, var(--color-bg-secondary) ${depthShade}%, var(--color-bg-primary))`}
                      stroke="var(--color-border)"
                    />
                    <rect width="6" height="42" rx="4" fill={node.data.team.color} />
                    <text x="12" y="18" fill="var(--color-text-primary)" fontSize="12">
                      {node.data.team.name}
                    </text>
                    <text x="12" y="33" fill="var(--color-text-muted)" fontSize="10">
                      {(byTeam.get(node.data.team.id) ?? []).length} members
                    </text>
                  </g>
                );
              }

              const member: TeamMember = node.data.member;
              return (
                <g
                  key={idx}
                  transform={`translate(${node.x - 52}, ${node.y - 12})`}
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
                >
                  <circle cx="12" cy="12" r="12" fill={member.avatar.color} stroke="var(--color-border)" />
                  <text x="6" y="16" fill="var(--color-text-primary)" fontSize="10">
                    {member.avatar.initials}
                  </text>
                  <text x="30" y="11" fill="var(--color-text-primary)" fontSize="11">
                    {member.name}
                  </text>
                  <text x="30" y="24" fill="var(--color-text-muted)" fontSize="10">
                    {roleLabel(member)}
                  </text>
                  {(member.capacityMultiplier ?? 100) < 100 ? (
                    <text x="30" y="36" fill="var(--color-warning)" fontSize="10">
                      {member.capacityMultiplier}% capacity
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>

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

