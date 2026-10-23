# GET MR B Demonstration Implementation Plan

> **For agentic workers:** Implement the plan in this session, task by task. Tests precede behavior code. This workspace is not a Git repository, so commit steps do not apply.

**Goal:** Build a local, responsive, working multi-role delivery demonstration.

**Architecture:** Next.js serves the UI and JSON route handlers. Pure TypeScript domain functions calculate eligibility and enforce transitions. A local JSON file persists dummy state for the demonstration. Google Maps is optional at runtime.

**Tech Stack:** Next.js 16, React, TypeScript, CSS, Node test runner through tsx.

**Spec:** `docs/design.md`

## Global constraints

- Dummy data and test checkout only; never claim an order is real.
- Bucharest/RON and Europe/Bucharest are sample settings.
- A basket is scoped to one store.
- Product identity is separate from store offers.
- Google Maps key is optional; missing key must leave the app usable.

## Review focus

- A store at its closing time is not eligible.
- A store outside its delivery radius is not eligible.
- Out-of-stock offers cannot be ordered.
- Two professionals cannot both accept one mission.
- Invalid order-state actions leave state unchanged.

## Tasks

### Task 1: Domain and seed

Files: `src/lib/types.ts`, `src/lib/seed.ts`, `src/lib/domain.ts`, `src/lib/domain.test.ts`.

- [ ] Write tests for geo distance, opening hours, offer filtering/order, and order transitions.
- [ ] Observe failing tests.
- [ ] Implement types, seed, and pure domain logic.
- [ ] Observe passing tests.

### Task 2: State and API

Files: `src/lib/store.ts`, `src/app/api/state/route.ts`, `src/app/api/action/route.ts`, `src/lib/store.test.ts`.

- [ ] Write tests for persistence, one-store basket, and exclusive mission acceptance.
- [ ] Observe failing tests.
- [ ] Implement file-backed state and action route handlers.
- [ ] Observe passing tests.

### Task 3: Application UI

Files: `src/app/page.tsx`, `src/app/globals.css`, `src/components/*`.

- [ ] Implement customer, merchant, professional, and admin role views around the API.
- [ ] Implement responsive product listing, basket, timeline, mission cards, and actionable feedback.
- [ ] Add optional browser notification for a nearby mission.
- [ ] Verify build and walkthrough in the browser.

### Task 4: Maps and handoff

Files: `src/components/MapPanel.tsx`, `.env.example`, `README.md`.

- [ ] Add Google Maps loading with store/customer/courier markers when a key is configured.
- [ ] Keep a useful schematic fallback without a key.
- [ ] Document running, sample roles, configuration, and demonstration limits.
- [ ] Run tests, build, HTTP check, and browser QA.
