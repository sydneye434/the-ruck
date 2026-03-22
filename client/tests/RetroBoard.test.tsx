// Developed by Sydney Edwards
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RetroDetailPage } from "../src/pages/retros/RetroDetailPage";
import { ToastProvider } from "../src/components/feedback/ToastProvider";
import { RETRO_TEMPLATES, type RetroTemplateId } from "../src/lib/retroTemplates";
import type { RetroCard, Sprint, TeamMember } from "@the-ruck/shared";

const hoisted = vi.hoisted(() => ({
  getById: vi.fn(),
  getAllSprints: vi.fn(),
  getAllMembers: vi.fn(),
  getAllCards: vi.fn()
}));

vi.mock("../src/lib/api", () => ({
  api: {
    retros: {
      getById: hoisted.getById,
      cards: { getAll: hoisted.getAllCards }
    },
    sprints: { getAll: hoisted.getAllSprints },
    teamMembers: { getAll: hoisted.getAllMembers }
  },
  ApiClientError: class ApiClientError extends Error {}
}));

const sprint: Sprint = {
  id: "s1",
  name: "Sprint One",
  startDate: "2025-01-06",
  endDate: "2025-01-17",
  goal: "",
  status: "active"
};

const member: TeamMember = {
  id: "m1",
  name: "Alice",
  roleType: "team_member",
  coordinatorTitle: "",
  avatar: { color: "#111111", initials: "A" },
  defaultAvailabilityDays: 10,
  capacityMultiplier: 100,
  isActive: true,
  coordinatorTeamIds: []
};

function boardPayload(
  template: RetroTemplateId,
  opts: { isAnonymous?: boolean; phase?: Retro["phase"]; cards?: RetroCard[] } = {}
) {
  const isAnonymous = opts.isAnonymous ?? false;
  const phase = opts.phase ?? "reflect";
  const cards = opts.cards ?? [];
  return {
    retro: {
      id: "retro-1",
      sprintId: sprint.id,
      title: "Test Retro",
      template,
      phase,
      isAnonymous
    },
    columns: RETRO_TEMPLATES[template].columns,
    cards,
    actionItems: [],
    carriedOverItems: []
  };
}

function renderBoard(template: RetroTemplateId, extra?: Parameters<typeof boardPayload>[1]) {
  const payload = boardPayload(template, extra);
  hoisted.getById.mockResolvedValue(payload);
  hoisted.getAllSprints.mockResolvedValue([sprint]);
  hoisted.getAllMembers.mockResolvedValue([member]);
  hoisted.getAllCards.mockResolvedValue(payload.cards);

  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/retro/retro-1"]}>
        <Routes>
          <Route path="/retro/:id" element={<RetroDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe("RetroDetailPage (retro board)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem("the-ruck.retro.currentMemberId");
  });

  it("renders correct number of columns per template (SSC, 4Ls, MSG)", async () => {
    for (const [template, expected] of [
      ["start_stop_continue", 3],
      ["4ls", 4],
      ["mad_sad_glad", 3]
    ] as const) {
      const { unmount } = renderBoard(template);
      expect((await screen.findAllByRole("button", { name: /Add Card/i })).length).toBe(expected);
      unmount();
    }
  });

  it("anonymous mode: author names not rendered when isAnonymous=true", async () => {
    const card: RetroCard = {
      id: "c1",
      retroId: "retro-1",
      columnKey: "start",
      content: "Note",
      authorId: member.id,
      upvotes: [],
      groupId: null
    };
    renderBoard("start_stop_continue", { isAnonymous: true, phase: "discuss", cards: [card] });
    expect(await screen.findByText("Anonymous")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("Add Card: textarea on click, disappears on cancel", async () => {
    renderBoard("start_stop_continue");
    const addButtons = await screen.findAllByRole("button", { name: /Add Card/i });
    fireEvent.click(addButtons[0]);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("upvote: shows count and highlights when upvoted", async () => {
    const card: RetroCard = {
      id: "c1",
      retroId: "retro-1",
      columnKey: "start",
      content: "Vote",
      authorId: member.id,
      upvotes: [member.id],
      groupId: null
    };
    renderBoard("start_stop_continue", { phase: "discuss", cards: [card] });
    const upBtn = await screen.findByRole("button", { name: /👍/ });
    expect(within(upBtn).getByText("1")).toBeInTheDocument();
    expect(upBtn).toHaveStyle({ color: "var(--color-accent)" });
  });
});
