// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTeamTree } from "./utils/buildTeamTree";
import type { Team } from "./types/domain";

test("flat list of root-only teams → each is its own root node", () => {
  const teams: Team[] = [
    { id: "a", name: "A", parentTeamId: null, color: "#000" },
    { id: "b", name: "B", parentTeamId: null, color: "#000" }
  ];
  const roots = buildTeamTree(teams);
  assert.equal(roots.length, 2);
  assert.deepEqual(
    roots.map((r) => r.id).sort(),
    ["a", "b"]
  );
});

test("parent + 2 children → correct nesting", () => {
  const teams: Team[] = [
    { id: "p", name: "Parent", parentTeamId: null, color: "#000" },
    { id: "c1", name: "C1", parentTeamId: "p", color: "#000" },
    { id: "c2", name: "C2", parentTeamId: "p", color: "#000" }
  ];
  const roots = buildTeamTree(teams);
  assert.equal(roots.length, 1);
  assert.equal(roots[0].id, "p");
  assert.equal(roots[0].children.length, 2);
});

test("3-level deep tree → correct recursive nesting", () => {
  const teams: Team[] = [
    { id: "l1", name: "L1", parentTeamId: null, color: "#000" },
    { id: "l2", name: "L2", parentTeamId: "l1", color: "#000" },
    { id: "l3", name: "L3", parentTeamId: "l2", color: "#000" }
  ];
  const roots = buildTeamTree(teams);
  assert.equal(roots.length, 1);
  assert.equal(roots[0].children[0].id, "l2");
  assert.equal(roots[0].children[0].children[0].id, "l3");
});

test("circular reference input → does not throw; mutual parent links leave no orphan roots", () => {
  const teams: Team[] = [
    { id: "x", name: "X", parentTeamId: "y", color: "#000" },
    { id: "y", name: "Y", parentTeamId: "x", color: "#000" }
  ];
  const roots = buildTeamTree(teams);
  assert.ok(Array.isArray(roots));
  assert.equal(roots.length, 0);
});

test("empty array → returns empty array", () => {
  assert.deepEqual(buildTeamTree([]), []);
});
