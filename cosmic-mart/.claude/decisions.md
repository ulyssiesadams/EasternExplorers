# Architecture Decisions

> Why we built things the way we did. Prevents re-litigating settled questions.

---

## D-001: No Frontend Framework

**Decision:** Plain HTML/CSS/JS. No React, Vue, Angular, Svelte.
**Why:** The project spec explicitly requires it. No build step, no bundler, no node_modules.
**Amended 2026-10-05:** still true, but the site is no longer opened as bare
files — it is served by `server.js` (see D-002b). There is still nothing to
install and no build step: `node server.js` and open the page.
**Do not revisit.**

---

## D-002: No Backend / Server — ❌ SUPERSEDED by D-002b

**Decision:** Everything client-side. Mock data hardcoded in JS.
**Why:** Hackathon constraint. Eliminates deployment complexity. Assumed the API could be called directly from the browser.
**Why it failed:** the premise was wrong for the key this project actually has.
Kept here so the question isn't reopened.

---

## D-002b: Thin Node Proxy (`server.js`) — supersedes D-002

**Decision:** A dependency-free Node server serves the static site and exposes
`POST /api/chat`, which attaches the API key and forwards to the model.

**Why:** The browser *cannot* reach the model host with this key. Measured
against the live endpoint:

| Request | Result |
|---|---|
| No `Origin` header (server-side) | **200 OK** |
| Same request + `Origin: http://localhost:8080` | **401 Unauthorized** |
| `Access-Control-Allow-Origin` on any response | **never sent** |

Browsers always send `Origin` cross-origin, so a browser `fetch()` always 401s;
even a 200 would be discarded for the missing CORS header. The proxy provider
enforces this deliberately to stop keys being embedded in client code. No header
or fetch option works around it.

**Implications:**
- The key lives in `.env` and **never reaches the browser** — strictly safer
  than D-002, which accepted an exposed key. Not visible in DevTools, not a
  repo-leak risk.
- The upstream speaks OpenAI chat-completions format; `server.js` translates, so
  `callClaude()` kept its signature and all six agents were untouched.
- The site must be opened via `http://localhost:8080`, not `file://`.
- Keep `server.js` dependency-free — Node built-ins only.

**Do not revisit.**

---

## D-003: Sequential Agent Chain (Not Parallel)

**Decision:** The 6 agents run sequentially — output of each is input to the next.
**Why:** Each agent's output is needed to form the next agent's input. The Orchestrator must load context before the Eligibility Checker can run. The Eligibility result determines which branch fires. This is inherently sequential.
**Performance:** 5 API calls × 2-5 seconds = 10-25 seconds total. Acceptable for a demo. The typing indicator shows progress.

---

## D-004: CSS Emoji Product Cards — ❌ SUPERSEDED by D-004b

**Decision:** Product cards use styled CSS containers with large emoji on a light (#f0f0f4) background.
**Why:** reliability over photorealism — no network dependency.

---

## D-004b: Real Product Photos, Stored Locally — supersedes D-004

**Decision:** Product cards render `assets/products/<SKU>.jpg` inside a white
`.cm-product-img` panel using `object-fit: contain`. The path is derived from
`p.id`, so there is no image field duplicated in `mock-data.js`.

**Why:** emoji didn't read as a real storefront. The reliability concern behind
D-004 is still honoured — the 20 photos are **downloaded and committed**, not
hotlinked, so there is no network dependency at demo time.

**Sourcing:** Pixabay, filtered for white backgrounds. The `emoji` field still
exists in `mock-data.js` but is no longer rendered.

**Known gap:** a handful of photos are an imperfect match for the product name
(e.g. the speaker shot reads as a car subwoofer). Cosmetic only — swap the file
at `assets/products/<SKU>.jpg` to fix, no code change needed.

---

## D-005: 6-Agent Architecture (Not 1 Monolith Prompt)

**Decision:** Six separate Claude API calls, each with a focused system prompt.
**Why:** Each agent has a single job and can be independently tested. The Eligibility Checker can be tested without running the full chain. The Communication Agent can be given any resolution package to test message quality. Modularity also makes the demo explainable — we can show each step firing.
**Trade-off:** 5 API calls per resolution vs 1. Costs more tokens. Acceptable for prototype.

---

## D-006: CSS Gradient Background (Not Image Files)

**Decision:** The space/nebula background is pure CSS radial gradients layered on #0a0a1a.
**Why:** The spec explicitly requires this for performance. No image files needed. Works offline.
**Implementation:** Multiple `radial-gradient()` layers in the `body` background property, using teal (#0d4f5c) and deep purple (#2d1b69) at low opacity.

---

## D-007: Mock Order Data Is Frozen

**Decision:** The 4 mock orders in mock-data.js must not be modified.
**Why:** The demo scenarios in the spec depend on exact values (18 days for ORD-2026-4471, 41 days for ORD-2026-2744). Changing these values will break the demo scenarios.
**The 4 orders:**
- ORD-2026-4471: Headphones, 18 days, Tier 1, US → PRIMARY DEMO (defective → refund)
- ORD-2026-3892: Sneakers, 7 days, Standard, US → sizing/changed mind scenario  
- ORD-2026-3201: Blender, 25 days, Tier 2, UK → home category scenario
- ORD-2026-2744: Tablet, 41 days, Standard, Brazil → ESCALATION DEMO (outside window)

---

*Last updated: 2026-10-05*
