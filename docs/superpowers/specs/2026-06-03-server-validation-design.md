# Server-Side Validation Hardening — Design Spec
**Date:** 2026-06-03  
**Approach:** Option A — patch each endpoint in place, new helpers in shared module

---

## Context

All 8 Supabase Edge Functions already have a solid validation foundation:
- Body-size guards, safe JSON parsing, typed field sanitisers
- Auth + rate-limit on every user-facing endpoint
- Image magic-byte validation, Gemini response schema enforcement
- Password complexity, username allow-list, PII-masked logs in auth-proxy

This spec closes the remaining gaps without restructuring anything.

---

## Gaps & Fixes

### 1. `_shared/validate.ts` — new helpers

**`requirePost(req, corsHeaders?)`**  
Returns a `405 Method Not Allowed` response if `req.method` is not `POST`.  
All user-facing endpoints accept POST only. OPTIONS is handled before this check.

**`rejectBody(req, corsHeaders?)`**  
Returns `400 Bad Request` if the request carries any body.  
Used by endpoints that take no input (`cancel-subscription`, `delete-account`, `export-data`).  
Checks actual body bytes, not just the `Content-Length` header (header can be absent or spoofed).

**`validatePassword(raw)`**  
Returns an error string describing the first violation, or `null` if valid.  
Rules: must be a string, 8–128 characters, contain at least one letter and one digit.  
128-char ceiling prevents bcrypt DoS (bcrypt truncates at 72 bytes but some implementations hash the full input).

No new external dependencies — all helpers are pure TypeScript.

---

### 2. `auth-proxy` — password max length + validation logging

- Add `validatePassword` call for both `signin` and `signup` actions.
- For `signin`: reject passwords outside 8–128 chars before forwarding to Supabase (fail fast, avoid unnecessary upstream call).
- For `signup`: same check, plus existing letter+digit requirement stays.
- Log validation failures at `warn` level with the action and masked email (no password in logs, ever).

---

### 3. `cancel-subscription` — method + body enforcement

- Add `requirePost` before auth check.
- Add `rejectBody` after auth/rate-limit (endpoint takes no input).

---

### 4. `delete-account` — method + body enforcement

- Add `requirePost` before auth check.
- Add `rejectBody` after auth/rate-limit.

---

### 5. `export-data` — method + body enforcement

- Add `requirePost` before auth check.
- Add `rejectBody` after auth/rate-limit.

---

### 6. `create-checkout` — null email guard

- After `sanitiseEmail`, if result is `null` and `user.email` is also absent, return `400 Bad Request` with `"A valid email address is required."` before calling Stripe.
- Currently the code passes `null ?? user.email` to Stripe which could throw or create a session with no email.

---

### 7. `verify-session` — method enforcement

- Add `requirePost` before auth check.

---

### 8. `identify-coin` — method enforcement + log image validation failures

- Add `requirePost` before auth check.
- Add `console.warn` when `isValidImageBase64` returns false, including which field failed (`frontBase64` / `backBase64`) and the user ID. No image data in logs.

---

### 9. `send-trial-reminder` — method + real body check

- Add `requirePost` before the service-key auth check.
- Replace the `Content-Length`-header-only check with `rejectBody` which reads the actual bytes. The header can be absent on HTTP/2 requests; reading the body is authoritative.

---

## Error Response Format

All new validation errors follow the existing pattern:

```json
{ "error": "Descriptive message." }
```

HTTP status codes:
- `400` — bad input (wrong type, missing field, invalid format, unexpected body)
- `405` — wrong HTTP method

No stack traces, internal identifiers, or DB details in any error response.

---

## Logging Convention

All validation failures logged at `warn` level with:
- Function name prefix, e.g. `[auth-proxy]`
- What failed (field name, rule)
- Masked PII only (e.g. `k***e@gmail.com`, user ID is safe to log as it's an opaque UUID)
- Never log: passwords, tokens, raw image data, full email addresses

---

## What Is Not Changing

- Auth, rate-limiting, CORS — already correct everywhere
- `stripe-webhook` — driven by Stripe-signed events, no user input; no changes needed
- `send-trial-reminder` service-key auth — already timing-safe; only the body check is strengthened
- DB query parameterisation — already safe (Supabase client, no raw SQL)
- Gemini response validation (`validateCoin`) — already comprehensive

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/_shared/validate.ts` | Add `requirePost`, `rejectBody`, `validatePassword` |
| `supabase/functions/auth-proxy/index.ts` | Max password length, validation logging |
| `supabase/functions/cancel-subscription/index.ts` | `requirePost` + `rejectBody` |
| `supabase/functions/delete-account/index.ts` | `requirePost` + `rejectBody` |
| `supabase/functions/export-data/index.ts` | `requirePost` + `rejectBody` |
| `supabase/functions/create-checkout/index.ts` | Null email guard |
| `supabase/functions/verify-session/index.ts` | `requirePost` |
| `supabase/functions/identify-coin/index.ts` | `requirePost` + log image failures |
| `supabase/functions/send-trial-reminder/index.ts` | `requirePost` + real body check |
