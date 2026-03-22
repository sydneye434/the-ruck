# Running Agile at Scale with **The Ruck**

**Audience:** Scrum Masters, Release Train Engineers, Product Owners, Engineering Managers, and team leads who coordinate multiple teams or large product areas.

**Purpose:** This guide explains how to use **The Ruck** to support **Agile at scale** — aligned teams, transparent capacity, predictable delivery, and continuous improvement — without replacing your framework (SAFe, LeSS, Scrum@Scale, or “many Scrum teams + governance”). Use it as a **single source of truth** for sprints, work in flight, capacity, and retrospectives.

---

## 1. What “Agile at scale” means here

**Agile at scale** usually means:

- **Many teams** working toward related outcomes, with **dependencies** and **shared cadence** (or intentional offsets).
- **Predictability** without fantasy dates — capacity and velocity inform planning.
- **Transparency** — status, risk, and improvement actions are visible, not trapped in slides.
- **Governance light** — enough structure for alignment; not so much that teams can’t move.

**The Ruck** helps with the **operational layer**: who is on which team, how much work fits a sprint, where stories sit on the board, **collaborative estimation** (Planning Poker), **sprint health** and **burndown** signals, what happened in retros, and a **dashboard** for leadership syncs. It does **not** replace PI planning in a room, OKR tools, or portfolio financials — it **feeds** those conversations with data.

---

## 2. Map your real world to the app

| Real-world concept | In The Ruck |
|--------------------|-------------|
| **Team / squad** | **Team** membership + optional **team hierarchy** (parent/child teams for chapters, tribes, trains). |
| **Capacity / availability** | Per-member **default availability** and **capacity multiplier**; **Capacity Planning** per planning sprint. |
| **Sprint / iteration** | **Sprints** (planning → active → completed); one **active** sprint at a time per product instance. |
| **Backlog & flow** | **Backlog** + **Active Sprint** Kanban columns (Backlog, In Progress, In Review, Done). |
| **Velocity** | Computed when a sprint is **completed**; used in **Capacity Planning** and **Dashboard** trends. |
| **Ceremony: retro** | **Retros** per sprint; templates; phases Reflect → Discuss → Action Items → Closed; **carried-over** action items. |
| **Health / status** | **Dashboard**: active sprint, **Sprint Health** grade, velocity, team summary, retro/action items, activity feed. **Active Sprint → Health** tab: full score breakdown + trend vs last completed sprint. |
| **Estimation (collaborative)** | **Planning Poker** — real-time session (`/poker/:sessionId`) to vote on story points; facilitator reveals and saves agreed points to stories. |
| **Burn vs plan** | **Active Sprint → Burndown** tab: ideal vs actual, projection, capacity target; **Sprint Health** includes velocity adherence and capacity alignment. |

**Roles in the app** (team members): align titles to your org (e.g. Scrum Master, PO, coordinator) using **role type** and **coordinator** fields where you use chapter leads or RTE-style coordination.

---

## 3. Recommended rollout sequence (at scale)

Do this **once per environment** (or per “program”), then repeat per train/team as you onboard.

### Phase A — Foundation (week 1)

1. **Settings** (`/settings`)  
   - Set **default sprint length** (days) and **velocity window** (1–5 past sprints) so planning defaults match your cadence.  
   - Choose **story point scale** (Fibonacci vs T-shirt) for consistency across teams using the same instance.  
   - Set **date format** and **retro defaults** (template, anonymous) for your culture.

2. **Team topology** (`/team`)  
   - Create **teams** to match your structure (product teams, platform teams, chapters as “teams” if you track capacity there).  
   - Use **parent team** links for **hierarchy** (e.g. Train → Feature teams).  
   - Add **members**, roles, **capacity multipliers** (e.g. 50% if split across two products).  
   - Use **Org chart** (`/team/org-chart`) to validate **who sits where** — useful for PI planning prep and dependency conversations.

3. **Seed or import**  
   - Use **seed** for demos, or **Export** / manual JSON workflows if you later integrate with other systems (v1 is file-based).

### Phase B — Cadence (ongoing)

4. **Sprint creation** (`/sprints`)  
   - Create the **next sprint** in **planning**; set dates and goal.  
   - Use **Capacity Planning** before go-live: align **recommended capacity** with **velocity × availability**; save the **capacity target** on the sprint.

5. **Activate** the sprint when execution starts; complete it when done to **record velocity**.

### Phase C — Execution

6. **Backlog** (`/backlog`) — refine and pull work into the sprint; use **story points** and **assignees** consistently. Stories can stay **unestimated** until the team aligns in **Planning Poker** or refinement.  
7. **Planning Poker** (optional but powerful) — from **Backlog** or **Active Sprint**, **Start Planning Poker** when a sprint is **active**: pick who you are, choose the story queue (defaults to unestimated work), share the room link with the team, vote privately, **reveal**, agree points, **Save & next story**. Use it in **sprint planning**, **mid-PI refinement**, or **backlog grooming** so estimates are **transparent and comparable** across teams using the same instance.  
8. **Active Sprint** (`/sprint/active`) — daily flow; **Board** for WIP; **Burndown** for burn vs ideal and **risk of missing the sprint**; **Health** for the **Sprint Health Score** (see §4). Move cards; treat the board as the **single truth** for “where work is.”

### Phase D — Improvement

9. **Retros** (`/retros`) — one retro per sprint; run **through phases**; track **action items** with owners and dates; use **carried-over** items so accountability spans sprints.

10. **Dashboard** (`/dashboard`) — for Scrum-of-Scrums or leadership syncs: **Sprint Health** grade on the active sprint (hover **ⓘ** for the rubric), **velocity trend**, **active sprint** progress, **open / overdue** action items, **activity** feed.

---

## 4. Operating model: ceremonies with The Ruck

### Sprint Planning (multi-team context)

- **Before the session:** POs / leads ensure **backlog** items are ready to discuss; **Capacity Planning** is run for the **planning sprint** so numbers are honest. Use **Planning Poker** (or refinement beforehand) so **story points** reflect team consensus — especially when **multiple teams** share one instance and you need **comparable** sizing.  
- **In the session:** Pull items into the sprint; keep **WIP** visible on the **Active Sprint** board after activation.  
- **At scale:** If multiple teams share one instance, **name sprints** clearly (e.g. “Train X — Sprint 12”) and use **teams** + **labels** on stories for ownership.

### Planning Poker (collaborative estimation)

Use when you want **one shared ritual** for pointing — remote-friendly, no spreadsheets.

| Step | What to do |
|------|------------|
| **When** | Requires an **active sprint**. Open **Start Planning Poker** from **Backlog** or **Active Sprint**. |
| **Queue** | Defaults to **unestimated** stories in that sprint; optionally include already-pointed stories and **reorder** the queue. |
| **Facilitation** | Session creator is the **facilitator** (👑); if they drop, the **first remaining participant** takes over. They **reveal** votes, pick **agreed points** (median is suggested), **Save & next story**, or **re-vote** / **skip**. |
| **Sharing** | Copy the **room URL** (`/poker/...`) to chat; everyone picks **who they are** and joins the same session. Votes stay **hidden** until reveal. |
| **Outcome** | Only **agreed story points** are saved to the **story** record; the poker session itself is **not** persisted — treat it as a **live ceremony**, not an audit log. |

**At scale:** Run **separate poker sessions per team** if each team has its own sprint scope, or **one session per train** if you truly estimate a **shared** sprint backlog in one room. Align **Fibonacci vs T-shirt** in **Settings** first so **velocity** and **capacity** math stay meaningful across teams.

### Sprint Health Score & burndown (readiness signals)

**Sprint Health** is a **read-only** 0–100 score (letter grade **A–F**) built from **five** dimensions (20 points each): **velocity adherence** (pace vs burndown ideal), **scope stability** (late-added stories), **capacity alignment** (points vs capacity target), **team availability** (snapshot or live), and **retro health** (retro exists, engagement, action items, closure of prior actions). It is **computed on demand** for the active sprint and appears on the **Dashboard** (compact badge; hover **ⓘ** for the rubric) and on **Active Sprint → Health** (full breakdown + **trend** vs the **previous completed** sprint).

**Burndown** (**Active Sprint → Burndown**) shows **ideal vs actual** remaining work, **projection**, and your **capacity target** — the right view for **“are we on track this week?”**

**At scale:** Use **Health** in **Scrum of Scrums** or **steering** as a **conversation starter** (“scope creep,” “availability dip,” “retro actions stalling”) — not as a **single KPI** to optimize. **Complete the sprint** to store a **final** health snapshot for **history** and **trends**.

### Daily coordination

- Teams update the **Active Sprint** board; **Burndown** answers **burn vs plan**; **Dashboard** gives a **snapshot** (including **Sprint Health**) for syncs without asking for slide decks.  
- **Reduced capacity** (multipliers, time off) is visible in **team** views — use that in **cross-team** planning when the same people appear on multiple teams.

### Sprint Review

- **Done** column + **completed sprint** velocity = factual outcomes.  
- Demo narrative stays human; **The Ruck** supplies **what shipped** and **at what cost** in points.

### Sprint Retrospective

- **Create retro** from **Retros**; pick **template** and **anonymous** mode per psychological safety needs.  
- **Reflect** early and often; **Discuss** to cluster and vote; **Action items** with **owners** and **due dates**.  
- **Close** the retro to lock the record; **open actions** roll forward to **Dashboard** and **next retro** context.

### Inspect & adapt at scale

- Use **velocity trend** + **capacity targets** to spot **over-commitment** or **under-utilization**.  
- Use **Sprint Health** + **burndown** to discuss **delivery risk** and **systemic** issues (scope, availability, retro follow-through).  
- Use **overdue action items** on the **Dashboard** as a **governance signal** (not blame — “what’s stuck?”).

---

## 5. Practices that make “scale” work

1. **One active sprint** per product line in this instance — mirrors one execution focus; if you need parallel tracks, use **separate instances** or strict naming/team filters.  
2. **Capacity before commitment** — always run **Capacity Planning** when people, holidays, or multipliers change.  
3. **Consistent pointing** — same scale (Fibonacci or T-shirt) in **Settings**; use **Planning Poker** or refinement **before** the planning meeting so the room commits to **known** sizes.  
4. **Unestimated work is explicit** — stories can have **no points** until the team agrees; don’t invent points in isolation if you claim **team ownership** of the estimate.  
5. **Look at flow and signals weekly** — **Burndown** for trajectory; **Health** for holistic risk — then **act** (scope, help, retro focus), don’t just record the score.  
6. **Retro hygiene** — close retros; **action items** must have **owners**; review **carried-over** items at the next retro (this also feeds **Sprint Health**).  
7. **Hierarchy honesty** — **team tree** and **org chart** should match **real reporting / coordination** — not an ideal org chart from a slide deck.  
8. **Data export** — **Settings → Export** before major process changes or migrations; **Reset** only in controlled environments.

---

## 6. Anti-patterns to avoid

| Anti-pattern | Why it hurts at scale | Better approach |
|--------------|------------------------|-----------------|
| Skipping capacity planning | Commits exceed reality; velocity noise | **Capacity Planning** + honest **multipliers** |
| Inactive members still assigned | Ghost capacity | **Deactivate** or fix **availability** |
| Retros never close | Open loops multiply | **Close retro**; track **actions** on Dashboard |
| Multiple “sources of truth” | Teams optimize locally | **Board + backlog** as the only execution state |
| Ignoring carried-over actions | Same issues every PI | Review **carried-over** block at each retro |
| Treating Sprint Health as a target to “game” | Local optimization; hides real problems | Use it to **start conversations**; fix **root causes** (scope, capacity, retro follow-through) |
| Poker without facilitator discipline | Chaotic reveals; estimates don’t stick | One **facilitator** per session; **agree** points before moving on |
| Estimating alone for “speed” | Silent misalignment across teams | **Planning Poker** or **paired** refinement so assumptions surface |

---

## 7. Who does what (suggested)

| Role | Primary areas in The Ruck |
|------|---------------------------|
| **Scrum Master / RTE** | Facilitate **retros**, **sprint** transitions, **Planning Poker** sessions when needed, **dashboard** / **Health** / **burndown** review in syncs; keep **teams** accurate. |
| **Product Owner** | **Backlog** order, story clarity, **sprint goal**; align with **capacity**; join **poker** to clarify scope, not to override the team’s estimate. |
| **Team lead / EM** | **Team** membership, **capacity multipliers**; **Org chart** accuracy. |
| **Engineers** | **Active Sprint** updates; **Planning Poker** votes; **retro** cards; **action items** they own. |
| **Leadership** | **Dashboard** (**Sprint Health**, velocity, actions) for trends; **not** day-to-day card moves — avoid **micro-managing** the board. |

---

## 8. Summary

**The Ruck** supports **Agile at scale** by making **teams**, **capacity**, **flow**, **estimation**, **delivery signals**, and **improvement** **visible and connected**. Use **Settings** → **Team** → **Sprints** → **Backlog** / **Planning Poker** (as needed) → **Active Sprint** (board, **burndown**, **health**) → **Retros** → **Dashboard** as your **loop**; use **export** and **clear documentation** when you change process or scale the number of teams.

For **installation and URLs**, see the root **`README.md`**.

---

*This document describes the intended use of The Ruck v1 features. Roadmap items (e.g. auth, multi-tenant, durable database backing, optional persistence for poker session history) may extend these patterns.*

---

*Developed by Sydney Edwards.*
