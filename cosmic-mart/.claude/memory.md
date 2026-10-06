# Session Memory

> Running log of observations, gotchas, and notes. Most recent first.
> Clear old entries when they become irrelevant.

---

## 2026-10-05 — Proxy wiring + storefront pass

- **API is live.** The `voc-*` key works — it is a Vocareum proxy key, not a
  direct Anthropic key, and reaches `claude-sonnet-4-6` through
  `openai.vocareum.com` in **OpenAI chat-completions format**. Verified
  end-to-end. (An earlier note here wrongly called the key invalid because it
  didn't look like `sk-ant-...`. It is valid; it just isn't a first-party key.)
- **A server now exists:** `server.js` serves the site and proxies `/api/chat`.
  Required, not optional — see D-002 in decisions.md.
- Product cards now use **real photos** in `assets/products/<SKU>.jpg`, not
  emoji (D-004 superseded).
- Homepage restructured: carousel → Top Deals → categories → popular → rewards.
- Logo is `assets/logo.png`, cropped from the brand reference, transparent.

## 2026-10-05 — Initial Setup Session

- Full project scaffolding created in one session
- 4 parallel subagents used to build CSS, JS data layer, HTML pages, and returns system simultaneously
- CLAUDE.md hierarchy established: root, js/, css/, .claude/
- All mock data matches the project spec exactly — do not modify

## Known Gotchas

- **Run `node server.js`** — opening the HTML over `file://` means no
  `/api/chat`, so every agent call fails.
- The browser must **never** call the model host directly: the proxy returns
  **401** whenever an `Origin` header is present, and sends no
  `Access-Control-Allow-Origin`. This is deliberate upstream behaviour.
- `css/global.css` has **no** `--space-*`, `--radius-*`, or font custom
  properties, despite what older docs claimed. Check `:root` before using a var.
- Orbitron font takes a moment to load — the logo might flash in a fallback font briefly
- The returns page order lookup must populate the agent context BEFORE the chat widget accepts input — enforce this in chat-ui.js
- ORD-2026-2744 (41 days) is intentionally outside the 30-day window — this triggers the escalation path

## Notes for Next Session

- Start by reading .claude/sprint.md to see current task list
- Start the server first: `node server.js` from `cosmic-mart/`
- returns.html and agent.js are the priority — polish other pages later
- Git is **not installed** on this machine and no repo exists yet; `.gitignore`
  files are staged and correct for whenever that happens.

---

*Add new notes at the TOP (most recent first)*
