# Landing Page — Design Spec
**Date:** 2026-06-03
**Status:** Approved

## Goal

A single-page marketing site to capture email + platform signups and validate interest in the Coin Collector app before launch. Success = knowing how many people are interested and which platform (iOS vs Android) they're on.

---

## Project Structure

New folder: `landing/` at the repo root, separate from the existing `web/` folder.

**Stack:** Next.js + Tailwind CSS
- Next.js API route handles the Supabase insert server-side (no exposed keys in the browser)
- Static export or Vercel deployment
- No auth, no routing — single page only

---

## Visual Design

**Style:** Neo-Tech
- Background: `#0d0d0d` with a subtle amber grid overlay (`rgba(255,184,0,0.03)`)
- Accent: `#FFB800` amber
- Text: `#ffffff` (headings), `#4a4a4a` (body), `#444` (muted)
- Fonts: `Outfit` (headings, weight 300/700/900) + `DM Mono` (labels, tags, code-style elements)
- No border-radius beyond 3–4px — sharp, technical feel
- All section dividers are `1px solid rgba(255,184,0,0.08)`

---

## Page Sections (top to bottom)

### 1. Nav
- Left: `COIN//COLLECTOR` wordmark in DM Mono amber
- Right: `BETA SOON` badge (amber border, no fill)
- No navigation links — this is not a multi-page site

### 2. Hero
**Left column:**
- Eyebrow tag: `// AI-POWERED NUMISMATIC INTELLIGENCE`
- Headline: `IDENTIFY` (white, 72px, weight 900) / `ANY COIN.` (amber, same size)
- Subtext: one sentence explaining the value prop
- Email form + `→ JOIN WAITLIST` button
- Below the form: `I'M ON` label + platform dropdown (`Select platform` / `iOS` / `Android`)
- Fine print: `No spam, ever.`

**Right column:**
- Coin scan widget: circle with corner brackets, scan line, amber glow
- Below widget: simulated scan result card showing coin name, grade, and estimated value

### 3. Stats Bar
Three stats in a horizontal grid, separated by `rgba(255,184,0,0.08)` dividers:
- `15k+` — COINS IN DATABASE
- `<2s` — AVERAGE SCAN TIME
- `98%` — IDENTIFICATION ACCURACY

> Note: these are aspirational/marketing numbers for the landing page. Update before launch if real data is available.

### 4. Features
Section tag: `// FEATURES`

Three feature cells in a bordered grid:
1. **AI Recognition** — `01 //` — Instant ID from 15,000+ coins spanning ancient to modern
2. **Collection Manager** — `02 //` — Build and track your full collection
3. **Market Value** — `03 //` — Live rarity scores and pricing data

Each cell has a `24px` amber accent bar at the bottom.

### 5. How It Works
Section tag: `// HOW IT WORKS`

Three steps with oversized ghost numbers (`rgba(255,184,0,0.06)`):
1. **Point** — aim your camera at any coin
2. **Snap** — AI processes in under 2 seconds
3. **Know** — name, date, mint, rarity, and market value

Steps connected by `→` arrows between them.

### 6. Bottom CTA
- Tag: `// JOIN THE WAITLIST`
- Headline: `Be First to Know.` (`Know.` in amber)
- Subtext: one line
- Duplicate email form + `→ NOTIFY ME` button
- Duplicate `I'M ON` platform dropdown

### 7. Footer
- Left: `COIN//COLLECTOR` wordmark (very muted, `#2a2a2a`)
- Right: `© 2026`

---

## Data Model

**Supabase table: `waitlist`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | auto-generated |
| `email` | text | validated, lowercase, trimmed |
| `platform` | text | `'ios'` or `'android'` or `null` if not selected |
| `created_at` | timestamptz | auto |

**Supabase credentials:** The `landing/` folder uses its own `.env.local` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` copied from the root `.env`. The service role key is only used server-side in the API route — never in browser code.

**API route:** `POST /api/waitlist`
- Validates email format server-side
- Upserts on email (duplicate signup = update platform, update timestamp)
- Returns `{ success: true }` or `{ error: 'message' }`
- Never exposes Supabase service key to the browser

---

## Form Behaviour

- Both forms (hero + CTA) submit to the same `/api/waitlist` endpoint
- Platform dropdown is optional — user can submit without selecting
- On success: replace the submitted form with a confirmation message (`// YOU'RE ON THE LIST`) — the other form (if not submitted) remains visible
- On error: show inline error below the form in amber
- Button shows loading state during submit (disabled + `→ SENDING...`)
- No page navigation or redirect on success

---

## Responsive

- **Mobile (< 768px):** Hero switches to single column; coin widget hidden; headline scales down to ~48px; form goes full width
- **Tablet (768px–1024px):** Hero two-column retained but tighter padding
- **Desktop (1024px+):** Full layout as designed

---

## Out of Scope

- Analytics / tracking (add later)
- Social proof / testimonials (no real users yet)
- App store links (app not published yet)
- Blog, about page, or any other pages
- Dark/light mode toggle
