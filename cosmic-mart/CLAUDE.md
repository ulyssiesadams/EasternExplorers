# Cosmic Mart — Claude Code Master Context

> Auto-loaded every session. Read this before writing any code.
> For current sprint status → see `.claude/sprint.md`
> For past decisions → see `.claude/decisions.md`

---

## What This Is

A static HTML/CSS/JS demo website for Cosmic Mart (fictional Accenture APEX Hackathon client) with an embedded AI-powered Returns Resolution Agent. Built for a live demo on **Friday, October 9, 2026**.

**Priority order:** Returns Agent > Website polish > Everything else.

---

## Stack

- Pure HTML5, CSS3, Vanilla JavaScript — NO frameworks
- `server.js` — a thin Node dev server (built-in modules only, nothing to install). Serves the static site **and** proxies model calls.
- Claude `claude-sonnet-4-6`, reached through a Vocareum proxy **server-side**. The browser never calls the model directly — see "API Call Pattern" below for why.
- Google Fonts: Orbitron (headings/brand), Inter (body)
- All data is hardcoded mock data — no database

---

## File Structure

```
cosmic-mart/
├── server.js           ← Dev server + /api/chat proxy. Run: node server.js
├── .env                ← VOCAREUM_API_KEY (NEVER COMMIT — gitignored)
├── .env.example        ← Committed template; teammates copy to .env
├── index.html          ← Homepage
├── gadgets.html        ← Gadgets category (8 products)
├── fashion.html        ← Fashion category (6 products)
├── home.html           ← Home & Lifestyle category (6 products)
├── returns.html        ← Returns portal + AI chat (PRIORITY PAGE)
├── account.html        ← Account stub (mock user Alex Chen)
├── css/
│   ├── global.css      ← Variables, reset, typography, nav, footer
│   ├── components.css  ← Cards, buttons, badges, chat widget
│   └── pages/
│       ├── home.css
│       ├── category.css
│       └── returns.css
├── js/
│   ├── config.js       ← Client config, NO SECRETS. Safe to commit.
│   ├── mock-data.js    ← All products + orders
│   ├── agent.js        ← 6-agent Returns Resolution chain
│   ├── chat-ui.js      ← Chat widget rendering
│   └── global.js       ← Nav, cart stub, utilities
└── assets/
    ├── logo.png        ← Cosmic Mart logo (transparent circle)
    └── products/       ← 20 product photos, named by SKU (CM-G001.jpg …)
```

**Running it:** `node server.js` from `cosmic-mart/` → http://localhost:8080
The server exits immediately with an error if `.env` is missing or has no key.

---

## Color Palette (CSS Custom Properties — defined in global.css)

```css
--bg-primary:    #0a0a1a   /* near-black, main background */
--bg-secondary:  #0d1b2a   /* dark navy, cards/sections */
--accent:        #9333ea   /* vivid purple — brand color */
--accent-hover:  #a855f7   /* lighter purple for hover */
--accent-glow:   #c084fc   /* light purple, borders/glows */
--text-primary:  #ffffff
--text-secondary:#94a3b8   /* muted slate */
--success:       #10b981
--danger:        #ef4444
```

---

## Component Class Names (must be consistent across HTML and CSS)

```
.cm-nav            Navigation bar
.cm-logo           Logo SVG container
.cm-hero           Hero section
.cm-hero-content   Hero text/CTA inner
.cm-category-grid  3-column category card grid
.cm-category-card  Individual category card
.cm-product-grid   4-column product grid
.cm-product-card   Individual product card
.cm-product-img    Product image container (emoji on light bg)
.cm-btn            Base button
.cm-btn-primary    Purple filled button
.cm-btn-secondary  Outline button
.cm-badge          Rating/tag badge
.cm-section        Page section with standard padding
.cm-section-title  Section heading
.cm-footer         Footer
.cm-chat           Chat widget container
.cm-chat-messages  Scrollable messages area
.cm-bubble-user    Customer message bubble (white/light)
.cm-bubble-agent   Agent message bubble (purple)
.cm-chat-input     Chat input bar
.cm-typing         Typing indicator (animated dots)
.cm-order-lookup   Order ID input section on returns page
.cm-policy-sidebar Returns policy info sidebar
```

---

## Critical Rules

1. **Do not commit `.env`** — it holds the Vocareum API key. `js/config.js` is client-side only, holds no secret, and **is** committed. Never put a key back into it.
2. **Do not add pages/features not in this spec** — demo has fixed scope
3. **Do not use frameworks** — plain HTML/CSS/JS only. `server.js` is deliberately dependency-free; keep it that way.
4. **Do not use lorem ipsum** — use real Cosmic Mart product names
5. **The mock order data is exact** — the demo scenarios depend on specific values

---

## Google Fonts Import (goes in every HTML `<head>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

---

## JS Script Load Order (every HTML page)

```html
<script src="js/config.js"></script>
<script src="js/mock-data.js"></script>
<script src="js/global.js"></script>
<!-- page-specific scripts last -->
```

---

## API Call Pattern

The browser calls our **own** server at `/api/chat` (same origin, so no CORS).
`server.js` attaches the key and forwards upstream.

```
Browser  ──POST /api/chat──▶  server.js  ──Bearer key──▶  openai.vocareum.com
                                                            └─▶ claude-sonnet-4-6
```

```javascript
// js/agent.js — every agent goes through this one function
async function callClaude(systemPrompt, userMessage, maxTokensOverride) {
  const response = await fetch(API_ENDPOINT, {          // '/api/chat'
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: maxTokensOverride || MAX_TOKENS
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(function () { return {}; });
    throw new Error('API error: ' + (err.error || response.statusText));
  }
  const data = await response.json();
  return data.text;
}
```

**Request:** `{ system, messages: [...], maxTokens }` → **Response:** `{ text }`

### Why there is a server at all

The spec originally said "no backend, call the API from the browser." That is
not possible with the Vocareum proxy key this project uses. Measured directly:

| Request | Result |
|---------|--------|
| No `Origin` header (server-side) | **200 OK** |
| With `Origin: http://localhost:8080` | **401 Unauthorized** |
| `Access-Control-Allow-Origin` on any response | **never sent** |

Browsers always attach `Origin` on cross-origin requests, so a browser `fetch()`
to the proxy will always 401 — and even a 200 would be discarded for the missing
CORS header. No header tweak fixes this; it is enforced upstream on purpose.
Don't re-litigate this. Side benefit: the key never reaches the browser.

> The upstream speaks **OpenAI chat-completions** format, not Anthropic Messages
> format. `server.js` handles that translation, which is why `callClaude()` keeps
> its original signature and all six agent functions are untouched.

---

*Last updated: 2026-10-05 | Website built | Agent wired to Vocareum proxy via server.js*
