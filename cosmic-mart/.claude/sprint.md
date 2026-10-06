# Sprint Tracker

> Update this at the START and END of every session.
> This is the first thing Claude reads to know where we are.

---

## Current Sprint: Sprint 2 — Verify the Returns Agent

**Status:** IN PROGRESS
**Goal:** The 6-agent chain is written; it has **not** yet been run end-to-end
through the UI. Prove both demo scenarios work in a browser.
**Start with:** `node server.js`, open http://localhost:8080/returns.html

---

## Sprint 0 — Environment & Setup ✅ COMPLETE

- [x] Created `cosmic-mart/` directory and full file structure
- [x] CLAUDE.md documentation hierarchy created
- [x] `.gitignore` created at repo root + `cosmic-mart/` (excludes `.env`, keeps `js/config.js`)
- [x] Google Fonts import defined in CLAUDE.md
- [x] API key obtained — Vocareum proxy key, stored in `cosmic-mart/.env`
- [x] API verified end-to-end — `claude-sonnet-4-6` responds via `POST /api/chat`
- [x] `server.js` written (serves site + proxies model calls; see D-002b)

---

## Sprint 1 — Build the Website ✅ COMPLETE

- [x] `css/global.css`, `components.css`, `pages/{home,category,returns}.css`
- [x] `js/mock-data.js` — 20 products + 4 orders
- [x] `js/global.js` — nav, cart stub, global chat widget
- [x] All 6 pages built: `index`, `gadgets`, `fashion`, `home`, `account`, `returns`
- [x] Two-row Walmart-style header across all pages
- [x] Real logo (`assets/logo.png`) + 20 real product photos (`assets/products/`)
- [x] Homepage restructured: carousel → Top Deals → categories → popular → rewards

---

## Sprint 2 — Returns Agent

- [x] `js/agent.js` — 6-agent chain written (Orchestrator, Eligibility, Classifier, Resolution, Communication, Escalation)
- [ ] **Primary demo scenario verified in browser:** ORD-2026-4471 → defective headphones → full refund offer
- [ ] **Escalation scenario verified in browser:** ORD-2026-2744 → 41 days out of window → escalation message
- [ ] Confirm each agent's JSON parses reliably (watch for non-JSON responses)

---

## Sprint 3 — Integration (Wednesday evening)

- [ ] `js/chat-ui.js` wired to agent.js
- [ ] Order lookup pre-populates agent context
- [ ] Typing indicator implemented
- [ ] Error handling implemented
- [ ] account.html "Start Return" links to returns.html with order ID pre-filled

---

## Sprint 4 — Polish & Demo Prep (Thursday)

- [ ] 5x stable run of primary demo scenario
- [ ] 3x stable run of escalation scenario
- [ ] Screenshot backup of each demo step
- [ ] Full visual QA on laptop browser
- [ ] Build FROZEN at Thursday 12:00 PM
- [ ] 2x full pitch rehearsal with team

---

## Blockers

*None blocking the agent.* The API key blocker is resolved — the key is in
`cosmic-mart/.env` and verified working.

Open items, not blockers:
1. **Git not installed** on this machine, so no repo exists yet. `.gitignore`
   files are written and correct for whenever Git is available.
2. **A few product photos mismatch their product name** (cosmetic) — drop a
   replacement at `assets/products/<SKU>.jpg`, no code change needed.

---

*Last updated: 2026-10-05*
