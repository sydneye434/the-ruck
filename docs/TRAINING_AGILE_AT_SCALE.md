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

**The Ruck** helps with the **operational layer**: who is on which team, how much work fits a sprint, where stories sit on the board, what happened in retros, and a **dashboard** for health at a glance. It does **not** replace PI planning in a room, OKR tools, or portfolio financials — it **feeds** those conversations with data.

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
| **Health / status** | **Dashboard**: active sprint, velocity, team summary, retro/action items, activity feed. |

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

6. **Backlog** (`/backlog`) — refine and pull work into the sprint; use **story points** and **assignees** consistently.  
7. **Active Sprint** (`/sprint/active`) — daily flow; move cards; treat the board as the **single truth** for “where work is.”

### Phase D — Improvement

8. **Retros** (`/retros`) — one retro per sprint; run **through phases**; track **action items** with owners and dates; use **carried-over** items so accountability spans sprints.

9. **Dashboard** (`/dashboard`) — for Scrum-of-Scrums or leadership syncs: **velocity trend**, **active sprint** progress, **open / overdue** action items.

---

## 4. Operating model: ceremonies with The Ruck

### Sprint Planning (multi-team context)

- **Before the session:** POs / leads ensure **backlog** items are roughly sized; **Capacity Planning** is run for the **planning sprint** so numbers are honest.  
- **In the session:** Pull items into the sprint; keep **WIP** visible on the **Active Sprint** board after activation.  
- **At scale:** If multiple teams share one instance, **name sprints** clearly (e.g. “Train X — Sprint 12”) and use **teams** + **labels** on stories for ownership.

### Daily coordination

- Teams update the **Active Sprint** board; **Dashboard** gives a **snapshot** for syncs without asking for slide decks.  
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
- Use **overdue action items** on the **Dashboard** as a **governance signal** (not blame — “what’s stuck?”).

---

## 5. Practices that make “scale” work

1. **One active sprint** per product line in this instance — mirrors one execution focus; if you need parallel tracks, use **separate instances** or strict naming/team filters.  
2. **Capacity before commitment** — always run **Capacity Planning** when people, holidays, or multipliers change.  
3. **Consistent pointing** — same scale (Fibonacci or T-shirt) in **Settings**; calibrate in refinement, not in the planning meeting.  
4. **Retro hygiene** — close retros; **action items** must have **owners**; review **carried-over** items at the next retro.  
5. **Hierarchy honesty** — **team tree** and **org chart** should match **real reporting / coordination** — not an ideal org chart from a slide deck.  
6. **Data export** — **Settings → Export** before major process changes or migrations; **Reset** only in controlled environments.

---

## 6. Anti-patterns to avoid

| Anti-pattern | Why it hurts at scale | Better approach |
|--------------|------------------------|-----------------|
| Skipping capacity planning | Commits exceed reality; velocity noise | **Capacity Planning** + honest **multipliers** |
| Inactive members still assigned | Ghost capacity | **Deactivate** or fix **availability** |
| Retros never close | Open loops multiply | **Close retro**; track **actions** on Dashboard |
| Multiple “sources of truth” | Teams optimize locally | **Board + backlog** as the only execution state |
| Ignoring carried-over actions | Same issues every PI | Review **carried-over** block at each retro |

---

## 7. Who does what (suggested)

| Role | Primary areas in The Ruck |
|------|---------------------------|
| **Scrum Master / RTE** | Facilitate **retros**, **sprint** transitions, **dashboard** review in syncs; keep **teams** accurate. |
| **Product Owner** | **Backlog** order, story clarity, **sprint goal**; align with **capacity**. |
| **Team lead / EM** | **Team** membership, **capacity multipliers**; **Org chart** accuracy. |
| **Engineers** | **Active Sprint** updates; **retro** cards; **action items** they own. |
| **Leadership** | **Dashboard** for trends; **not** day-to-day card moves — avoid **micro-managing** the board. |

---

## 8. Summary

**The Ruck** supports **Agile at scale** by making **teams**, **capacity**, **flow**, and **improvement** **visible and connected**. Use **Settings** → **Team** → **Sprints** → **Backlog** / **Active Sprint** → **Retros** → **Dashboard** as your **loop**; use **export** and **clear documentation** when you change process or scale the number of teams.

For **installation and URLs**, see the root **`README.md`**.

---

*This document describes the intended use of The Ruck v1 features; roadmap items (auth, multi-tenant, real-time, database) may extend these patterns.*

---

*Developed by Sydney Edwards.*
