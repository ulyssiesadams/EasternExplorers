# Cosmic Mart — CSS Layer Context

> Auto-loaded when Claude Code works in /css. Design system reference.

---

## File Map

| File | Purpose |
|------|---------|
| `global.css` | CSS custom properties, reset, typography, nav, footer, buttons |
| `components.css` | Cards, chat widget, badges, form elements |
| `pages/home.css` | Homepage-specific sections (hero, rewards banner) |
| `pages/category.css` | Shared category page layout (filter sidebar + product grid) |
| `pages/returns.css` | Returns page (order lookup, chat interface, policy sidebar) |

---

## CSS Custom Properties (defined in global.css :root)

This is the **complete** list — verified against `global.css`. There are no others.

```css
:root {
  --bg-primary:    #0a0a1a;
  --bg-secondary:  #0d1b2a;
  --accent:        #9333ea;
  --accent-hover:  #a855f7;
  --accent-glow:   #c084fc;
  --text-primary:  #ffffff;
  --text-secondary:#94a3b8;
  --success:       #10b981;
  --danger:        #ef4444;
  --nav-height:    122px;
  --border-purple: rgba(147, 51, 234, 0.3);
  --surface-white: #ffffff;
}
```

⚠️ **Do not use these — they do not exist**, despite earlier versions of this
doc listing them: `--accent-deep`, `--border` (the real name is
`--border-purple`), `--font-brand`, `--font-body`, `--space-xs/sm/md/lg/xl`,
`--radius-sm/md/lg/full`. Referencing any of them silently yields an invalid
value and the declaration is dropped. Use literal values, or add the property
to `:root` first and update this list.

---

## Typography Rules

There are no font custom properties — write the stacks literally:

- `font-family: 'Orbitron', sans-serif` → Logo, page headings (h1, h2), nav links, buttons
- `font-family: 'Inter', sans-serif` → Body text, descriptions, prices, form inputs, chat messages

Both are pulled in by the `@import` at the top of `global.css`.

---

## Space Background Implementation

```css
body {
  background-color: var(--bg-primary);
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(13, 79, 92, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(45, 27, 105, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 80%, rgba(147, 51, 234, 0.08) 0%, transparent 40%);
}
```

---

## Component Class Reference

```
Navigation (two-row header; .cm-nav is the sticky wrapper)
  .cm-nav              sticky header wrapper (blur + shadow on scroll)
  .cm-nav-main         row 1 — purple gradient brand bar
  .cm-nav-logo         logo link wrapper
  .cm-logo-img         logo <img> (assets/logo.png)
  .cm-nav-location     "Pickup or delivery?" pill (visual only)
  .cm-nav-search       white pill search form (visual only, no submit)
  .cm-nav-actions      Reorder / Sign In / cart cluster
  .cm-nav-action       single action (icon + small/bold label stack)
  .cm-nav-cart         cart column (icon + badge + $ total)
  .cm-cart-badge       count bubble on the cart icon
  .cm-nav-sub          row 2 — category bar (scrolls on overflow)
  .cm-nav-pill         Departments / Services / More pill button
  .cm-nav-links        flex row of page links (global.js adds .active)

Cards
  .cm-category-card    large category card (icon + name + count)
  .cm-product-card     product card (image + name + price + CTA)
  .cm-product-img      white panel holding the product photo (object-fit: contain)
  .cm-product-name     product title
  .cm-product-price    price display
  .cm-rating           star rating row

Buttons
  .cm-btn              base styles (border-radius, font, transition)
  .cm-btn-primary      purple fill (#9333ea)
  .cm-btn-secondary    outline only (border: 1px solid var(--accent))
  .cm-btn-sm           small size variant

Chat Widget
  .cm-chat             full widget container
  .cm-chat-header      purple header bar with title
  .cm-chat-messages    scrollable message area
  .cm-bubble-user      right-aligned white/light bubble
  .cm-bubble-agent     left-aligned purple bubble
  .cm-typing           animated three-dot indicator
  .cm-chat-input-bar   bottom input row (input + send button)

Returns Page
  .cm-order-lookup     order ID input + lookup button section
  .cm-returns-grid     2-column layout (chat + policy sidebar)
  .cm-policy-sidebar   policy info panel
  .cm-policy-item      individual policy rule row

Layout
  .cm-section          standard page section (padding top/bottom)
  .cm-section-title    section heading with optional purple underline
  .cm-container        max-width wrapper (1200px, centered)
  .cm-grid-4           4-column responsive grid
  .cm-grid-3           3-column responsive grid
  .cm-grid-2           2-column responsive grid

Badges
  .cm-badge            small pill badge
  .cm-badge-success    green badge
  .cm-badge-accent     purple badge
  .cm-badge-muted      gray badge
```

---

## Rules

- Use the custom properties above for colors — no raw hex outside `:root`. Spacing and radii have no properties, so literal px/rem values are expected there.
- No `!important` anywhere
- No inline styles in HTML (except dynamic JS-controlled values)
- Mobile-first: default styles mobile, media queries add desktop layout
- Breakpoints: `@media (min-width: 768px)` tablet, `@media (min-width: 1024px)` desktop

---

*See root CLAUDE.md for full project context*
