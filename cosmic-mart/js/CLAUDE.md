# Cosmic Mart — JS Layer Context

> Auto-loaded when Claude Code works in /js. Agent and data layer reference.

---

## File Map

| File | Purpose |
|------|---------|
| `config.js` | Client-side model config. **No secrets** — safe to commit. |
| `mock-data.js` | All product and order data. Exports to `window.mockData` |
| `agent.js` | 6-agent Returns Resolution chain |
| `chat-ui.js` | Chat widget rendering and event handling |
| `global.js` | Nav scroll behavior, cart stub, global chat widget |

> The API key is **not** in this folder. It lives in `cosmic-mart/.env` and is
> attached server-side by `../server.js`. Never put a key in `config.js` — that
> file is served to the browser.

---

## Config Variables (from config.js)

```javascript
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const API_ENDPOINT = '/api/chat';   // our own server, not api.anthropic.com
```

---

## Mock Data Structure

### Products (window.mockData.products)
```javascript
{
  id: 'CM-G001',
  name: 'StarBud Pro Wireless Headphones',
  category: 'gadgets',         // 'gadgets' | 'fashion' | 'home'
  price: 189.00,
  returnDays: 30,              // 30 gadgets, 14 fashion, 21 home
  rating: 4.5,
  emoji: '🎧'                 // Used in product card display
}
```

### Orders (window.mockData.orders)
```javascript
{
  order_id: 'ORD-2026-4471',
  customer_id: 'CST-88821',
  customer_name: 'Alex Chen',
  customer_tier: 'Cosmic Rewards Tier 1',
  market: 'US',
  product_id: 'CM-G001',
  product_name: 'StarBud Pro Wireless Headphones',
  product_category: 'gadgets',
  purchase_price: 189.00,
  purchase_date: '2026-09-17',
  days_since_purchase: 18,
  order_status: 'Delivered'
}
```

---

## Agent Architecture (agent.js)

6 sequential Claude API calls. Each is a separate async function.

```
runOrchestrator(customerMessage, orderData)
  → context object (JSON)
  → runEligibilityChecker(context)
    → eligible: true → runReturnClassifier(context, message)
                         → runResolutionGenerator(context, classification)
                           → runCommunicationAgent(resolution)
                             → display final message
    → eligible: false → runEscalationAgent(context, eligibility)
                          → display escalation message
```

### Return Categories (from Classifier)
- `DEFECTIVE` → Full refund OR free replacement + prepaid label
- `WRONG_ITEM` → Full refund + prepaid label
- `CHANGED_MIND` (unopened) → Full refund if within window
- `CHANGED_MIND` (opened) → Store credit
- `DAMAGED_TRANSIT` → Full refund + carrier claim
- `DESCRIPTION_MISMATCH` → Full refund + content team flag

### Return Windows (for Eligibility Checker)
- Gadgets: 30 days
- Fashion: 14 days
- Home: 21 days

### Loyalty Tier Modifier
- Tier 1+ members get extended windows and upgraded resolutions

---

## Base API Call Function

Every agent uses this function. It posts to **our own server**, which attaches
the key and forwards to the Vocareum proxy — the browser never holds the key and
never talks to the model host directly.

```javascript
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

**Endpoint contract**

| | Shape |
|---|---|
| Request | `{ system, messages: [{role, content}, ...], maxTokens }` |
| Success | `200` → `{ text }` |
| Bad input | `400` → `{ error }` (missing/empty `messages[]`, invalid JSON) |
| Upstream failure | `502` → `{ error }` |

`messages` is an array, so multi-turn works: `agent.js` sends a single user
message, while the Nova widget in `global.js` sends its whole history.
`maxTokens` is clamped server-side to 8192.

> The upstream speaks OpenAI chat-completions format; `server.js` translates.
> That is why this signature is unchanged from the original spec and all six
> agent functions below needed no edits.

---

## Primary Demo Scenario (test this first)

1. Load order `ORD-2026-4471` (StarBud Pro Headphones, 18 days, Tier 1, US)
2. Customer message: "My headphones stopped working after two weeks of normal use. I want to return them."
3. Expected chain: Orchestrator → Eligible (18 < 30 days) → DEFECTIVE → Full refund + replacement offer → Warm message with Case #CM-2026-4471

## Escalation Demo Scenario

1. Load order `ORD-2026-2744` (NovaPad X Tablet, 41 days, Standard, Brazil)
2. Customer message: "I want to return my tablet, I've had it about 6 weeks and never really used it."
3. Expected chain: Orchestrator → INELIGIBLE (41 > 30 days) → Escalation → Specialist message

---

*See root CLAUDE.md for full project context*
