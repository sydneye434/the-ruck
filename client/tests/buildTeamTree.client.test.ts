// Developed by Sydney Edwards
import { describe, it, expect } from "vitest";
import { buildTeamTree, withComputedDepth } from "../src/lib/buildTeamTree";
import type { Team } from "@the-ruck/shared";

describe("client buildTeamTree", () => {
  it("withComputedDepth matches shared semantics", () => {
    const teams: Team[] = [
      { id: "r", name: "R", parentTeamId: null, color: "#000" },
      { id: "c", name: "C", parentTeamId: "r", color: "#000" }
    ];
    const d = withComputedDepth(teams);
    expect(d.find((t) => t.id === "c")?.depth).toBe(1);
  });

  it("buildTeamTree nests children under parent", () => {
    const teams: Team[] = [
      { id: "p", name: "P", parentTeamId: null, color: "#000" },
      { id: "c", name: "C", parentTeamId: "p", color: "#000" }
    ];
    const roots = buildTeamTree(teams);
    expect(roots).toHaveLength(1);
    expect(roots[0].children[0].id).toBe("c");
  });

  it("withComputedDepth handles mutual parent cycles without throwing", () => {
    const teams: Team[] = [
      { id: "a", name: "A", parentTeamId: "b", color: "#000" },
      { id: "b", name: "B", parentTeamId: "a", color: "#000" }
    ];
    const d = withComputedDepth(teams);
    expect(d).toHaveLength(2);
    expect(d.every((t) => Number.isFinite(t.depth))).toBe(true);
  });

  it("buildTeamTree promotes nodes whose parent id is missing", () => {
    const teams: Team[] = [{ id: "solo", name: "S", parentTeamId: "ghost", color: "#000" }];
    const roots = buildTeamTree(teams);
    expect(roots.map((r) => r.id)).toEqual(["solo"]);
  });
});
