# Cosmic Mart — Returns Resolution Agent

A static retail storefront with an embedded AI returns agent, built for the
APEX hackathon. The website is the stage; the **Returns Resolution Agent** is
the product.

Demo day: **Friday, October 9, 2026.**

---

## Get it running (5 minutes)

### 1. Prerequisites

- **Node.js 18+** — check with `node --version`. Nothing else to install; the
  server uses only Node built-ins. There is no `npm install` step.

### 2. Add your API key

The repo does **not** include a key. You supply your own:

```bash
cd cosmic-mart
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

Then open `.env` and replace the placeholder:

```
VOCAREUM_API_KEY=voc-your-key-here
```

Use the **Vocareum proxy key from Udacity** (starts with `voc-`), not a key
from console.anthropic.com — our org doesn't permit direct Anthropic keys.
Ask Uly if you don't have one.

The server refuses to start without this and tells you exactly what's wrong.

### 3. Start it

```bash
cd cosmic-mart
node server.js
```

Open **http://localhost:8080**.

> **Do not open the HTML files directly.** Double-clicking `index.html` (a
> `file://` URL) loads the site but every AI feature fails silently, because
> `/api/chat` only exists while `server.js` is running.

---

## Try the demo

Go to **Returns** (inside the `More ▾` menu), then:

| Order ID | What it demonstrates |
|---|---|
| `ORD-2026-4471` | **Primary path.** Headphones, 18 days, Tier 1 member. Type *"My headphones stopped working after two weeks"* → full refund or replacement, ~23s. |
| `ORD-2026-2744` | **Escalation path.** Tablet, 41 days — outside the 30-day window. Routes to a human specialist, ~13s. |
| `ORD-2026-3892` | Sneakers, 7 days, Standard tier. |
| `ORD-2026-3201` | Blender, 25 days, Tier 2, UK market. |

The floating Cosmic Mart button (bottom-right of every page except Returns)
opens **Nova**, a general shopping assistant with its own chat.

---

## Why there is a server

The original spec called for a pure client-side site calling the model API
directly from the browser. That turned out to be impossible with a Vocareum
proxy key — measured behaviour:

| Request | Result |
|---|---|
| No `Origin` header (server-side) | `200 OK` |
| With `Origin: http://localhost:8080` | `401 Unauthorized` |
| `Access-Control-Allow-Origin` on any response | absent |

Vocareum blocks browser-originated calls by design, and browsers always send
`Origin` on cross-origin requests. So `server.js` is a thin proxy: it serves
the static files **and** forwards model calls with the key attached
server-side. No header tweak avoids this — please don't re-litigate it.

A side benefit: the key never reaches the browser, so it can't leak through
DevTools or a committed file.

```
Browser ──► localhost:8080/api/chat   (same origin, no CORS)
                    │  server.js attaches the key from .env
                    ▼
       openai.vocareum.com ──► claude-sonnet-4-6
```

---

## Layout

```
cosmic-mart/
├── server.js            static file server + /api/chat proxy
├── .env                 YOUR KEY — gitignored, never commit
├── .env.example          template to copy
├── index.html           homepage (carousel, deals, popular)
├── gadgets|fashion|home.html   category pages
├── returns.html         THE priority page — agent lives here
├── account.html         order history, "Start Return" links
├── css/
│   ├── global.css       tokens, reset, header, footer
│   ├── components.css   cards, buttons, chat bubbles
│   └── pages/           home, category, returns
├── js/
│   ├── config.js        client config — NO SECRETS, safe to commit
│   ├── mock-data.js     20 products + 4 orders
│   ├── agent.js         the 6-agent chain
│   ├── chat-ui.js       returns-page chat wiring
│   └── global.js        header, More menu, Nova widget
└── assets/              logo, 20 product photos, planet art
```

## The agent chain

Six sequential model calls in `js/agent.js`, each with one job:

```
Orchestrator ─► Eligibility ─┬─► Classifier ─► Resolution ─► Communication
                             └─► Escalation           (if ineligible)
```

Return windows: Gadgets 30 days · Fashion 14 days · Home & Lifestyle 21 days.

---

## Working on this in Claude Code

`CLAUDE.md` files load automatically and carry the real detail — root for
project context, `js/CLAUDE.md` for the agent and endpoint contract,
`css/CLAUDE.md` for the design tokens that actually exist. Read those before
changing anything; several of them correct earlier assumptions.

Current status and the remaining task list live in `cosmic-mart/.claude/sprint.md`.

**House rules:** no frameworks (plain HTML/CSS/JS), no inline `style=`
attributes, no `!important`, and colours/spacing come from the custom
properties in `global.css`.

## Never commit

`.env` · `*.log` · `CLAUDE.local.md` · any file with a real key in it.

Before your first push, confirm the key is protected:

```bash
git check-ignore -v cosmic-mart/.env
```

That must print a matching rule. If it prints nothing, **stop** — your key is
not protected.
