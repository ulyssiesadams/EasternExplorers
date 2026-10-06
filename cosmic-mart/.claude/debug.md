# Debug Log

> Known bugs, error messages seen, and solutions that worked.
> Add entries as you encounter issues. Most recent first.

---

## Template — Copy for new entries

```
### [DATE] — [Short description]
**Error:** (exact error message or symptom)
**Cause:** (what caused it)
**Fix:** (what solved it)
**Status:** RESOLVED / OPEN
```

---

## Common Issues to Watch For

### Server won't start — "VOCAREUM_API_KEY not found"
**Cause:** `cosmic-mart/.env` is missing or has no key
**Fix:** Copy `.env.example` to `.env` and paste the `voc-*` key in. The server
exits deliberately rather than booting in a broken state.

### `/api/chat` returns 404, agent does nothing
**Cause:** The page was opened over `file://` (double-clicked), so there is no
server and no `/api/chat` route
**Fix:** Run `node server.js` and open `http://localhost:8080`

### 502 from /api/chat — "upstream 401"
**Cause:** The key in `.env` is wrong/expired, **or** something is sending an
`Origin` header upstream. The proxy rejects any browser-looking request.
**Fix:** Verify the key. Never call `openai.vocareum.com` from browser code —
all model calls go through `server.js`. See D-002b in decisions.md.

### 502 from /api/chat — "upstream 404 model_not_found"
**Cause:** Wrong model id for this key. The Claude key only serves
`claude-sonnet-4-6`; the separate OpenAI key only serves `gpt-*` models.
**Fix:** Check `MODEL` in `server.js` is `claude-sonnet-4-6`.

### 400 from /api/chat — "messages[] is required"
**Cause:** The request body omitted `messages`, or sent an empty array
**Fix:** Post `{ system, messages: [{role, content}], maxTokens }`

### Port 8080 already in use
**Cause:** An old server is still running
**Fix:** `$c = Get-NetTCPConnection -LocalPort 8080 -State Listen; Stop-Process -Id $c[0].OwningProcess -Force`
— or start on another port: `$env:PORT=8081; node server.js`

### Agent Chain — undefined is not an object
**Cause:** JSON parsing failed on a Claude response (Claude returned non-JSON when JSON was expected)
**Fix:** Wrap JSON.parse() in try/catch in each agent function. Add explicit JSON format instructions to the system prompt.

### Chat Widget — Input fires before order loaded
**Cause:** Chat widget doesn't check if an order is loaded before allowing message submission
**Fix:** Disable the send button until an order is selected in the lookup

### Google Fonts — Not Loading
**Cause:** Network issue or ad blocker
**Fix:** Add system font fallbacks in CSS: `font-family: 'Orbitron', 'Arial Black', sans-serif`

---

*Add real bugs at the top as they are encountered*
