# CoinSeek Android App — Pre-Launch Checklist

**Audited:** 2026-06-01
**Target:** Native Android (Google Play Store)
**Stack:** React Native + Expo SDK 51 + Supabase + Stripe
**Total issues:** 19 launch blockers · 27 high · 12 medium · 10 low

---

## How to use this file

Each section below is self-contained and can be handed to a separate Claude session.
Attach this file and say: *"Work through the [SECTION NAME] section of this checklist."*
The Context for Claude section at the bottom gives every session the project background it needs.

---

## 🚨 LAUNCH BLOCKERS — App cannot ship without these

> Fix every item in this section before attempting a Play Store submission.
> Delegate prompt: *"Work through the LAUNCH BLOCKERS section of CHECKLIST.md. Read each referenced file before making changes. Fix all items."*

### Navigation Crashes
- [x] `OnboardingScreen` navigates to `'AuthStack'` which doesn't exist — crashes on first launch (`src/screens/OnboardingScreen.js:56`)
- [x] `'History'` route not registered in navigator — resolved by deleting orphaned `HomeScreen.js`; `HistoryScreen` now registered in ScanStack + ProfileStack
- [x] `'Settings'` route not registered in navigator — resolved by deleting orphaned `HomeScreen.js` (screen was never mounted)
- [x] `HistoryScreen` is unreachable — now imported and registered in `ScanStack` and `ProfileStack`

### Payments & Auth
- [x] Password reset is broken — `auth-proxy` now redirects to `https://coinseek.app/auth/callback` (matches `AuthContext` allowlist)
- [ ] Stripe webhook not configured in Stripe dashboard — subscriptions never auto-renew, cancellations don't reflect in DB (`supabase/functions/stripe-webhook/index.ts`) — MANUAL: configure in Stripe Dashboard → Webhooks
- [ ] `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY` Supabase secrets need to be set (`supabase/functions/create-checkout/index.ts:59-60`) — MANUAL: `supabase secrets set STRIPE_PRICE_ID_MONTHLY=price_xxx STRIPE_PRICE_ID_YEARLY=price_yyy`
- [ ] `GEMINI_API_KEY` Supabase secret needs to be confirmed as set — coin scanning silently returns 500 without it (`supabase/functions/identify-coin/index.ts:205`) — MANUAL: `supabase secrets set GEMINI_API_KEY=your_key`
- [x] Payment redirect uses `coinseek://` custom scheme — `create-checkout` success/cancel URLs and `useStripePayment` redirect prefix updated to `https://coinseek.app`

### Build & Store
- [x] No `eas.json` exists — `eas.json` created with development/preview/production build profiles
- [x] Android package name in `app.json` is `com.coincollector.app` — changed to `com.coinseek.app`
- [ ] `assetlinks.json` not hosted at `coinseek.app` — Android App Link verification will silently fail (`app.json` declares `autoVerify: true`) — MANUAL: host `/.well-known/assetlinks.json` at `coinseek.app` (run `eas build` first to get SHA-256 cert fingerprint)
- [ ] `coinseek.app` domain needs to be registered, SSL configured, and `.well-known/assetlinks.json` hosted — MANUAL: register domain, configure DNS/SSL, deploy static file
- [ ] Google Play Data Safety form must be completed before submission (app collects email, photos, payment info) — MANUAL: complete in Google Play Console
- [ ] `send-trial-reminder` edge function is never scheduled — MANUAL: enable pg_cron in Supabase dashboard, then run: `select cron.schedule('trial-reminder-daily', '0 9 * * *', $$select net.http_post(url:='https://<project>.supabase.co/functions/v1/send-trial-reminder', headers:='{"Authorization":"Bearer <anon_key>"}'::jsonb)$$);`

---

## 🔴 HIGH — Needs fixing before a good launch

> These won't prevent submission but will result in a poor user experience or mislead users.
> Delegate prompt: *"Work through the HIGH section of CHECKLIST.md. Read each referenced file before making changes. Fix all items."*

### Broken UI / Navigation
- [x] Google Sign-In button shows "coming soon" toast on both Login and Signup — *already removed; no OAuth button renders in either screen.*
- [x] "Rate the App" button — wired to `openPlayStoreListing()` in `ProfileScreen` via `src/utils/links.js`. *(Also fixed a real bug: `ANDROID_PACKAGE` was `com.coincollector.app`, now `com.coinseek.app` to match `app.json`.) The old `SettingsScreen.js` was deleted as dead code.*
- [x] "Help & Support" — wired to `openSupportEmail()` (`mailto:support@coinseek.app`) in `ProfileScreen`. *Old `SettingsScreen.js` deleted.*
- [x] "Privacy & Security" in `ProfileScreen` now `navigation.navigate('PrivacySecurity')`.
- [x] Collection "View All" — now toggles between the recent 10 and the full list (button only shows when >10), header switches "Recently Added" ⇄ "All Coins" (`src/screens/CollectionScreen.js`).
- [x] Onboarding "Sign in" link calls a dedicated `handleSignIn()` that navigates to `Login`.

### Fake / Misleading Data
- [x] Grade Distribution — now computed from the user's actual coin grades (top 5 by share), with an empty state when the collection is empty (`src/screens/CollectionScreen.js`).
- [x] Value Trends "+12.4%" widget — removed entirely (no real trend data exists; `getCoinValueTrends()` returns null).
- [x] "+4.2% change" pill — removed; caption now reads "Based on estimated market value".
- [x] "240,000+ coins · 200+ countries" — `ProfileScreen` now reads "AI Coin Identification · Identifies coins from around the world". `HomeScreen.js`/`SettingsScreen.js` were deleted as dead code.

### Paywall Features That Don't Exist Yet
- [x] "Professional grade reports you can share or print" → "Detailed grade & condition analysis for every coin" (`PlanSelectionScreen.js` and `UpgradeModal.js`).
- [x] "Export collection to PDF / CSV" — was only in the deleted `SettingsScreen.js`; no longer present in any live screen.
- [x] "Rarity Alerts" — was only in the deleted `SubscriptionScreen.js`; no longer present in any live screen.

### Privacy & Settings
- [x] Privacy/security toggles now read/write a persisted `privacy` object in the settings slice (auto-saved via `settingsPersistMiddleware`, restored on launch) — survives restarts (`PrivacySecurityScreen.js`, `settingsSlice.js`).
- [x] "Download My Data" now calls a new `export-data` edge function (`supabase/functions/export-data/index.ts`) that auth-checks, rate-limits, gathers the user's data and emails a JSON export via Resend.
- [x] "Clear Scan History" now dispatches `clearHistory()` and clears AsyncStorage (`saveHistory([])`).
- [x] Full Name is now editable inline in `AccountSettingsScreen` (saves to Redux + `profiles.display_name`). **Email left display-only** — changing the auth email requires a verification round-trip the custom `auth-proxy` doesn't yet support; tracked as follow-up.
- [ ] **Not done (architectural):** Plan-selection flag is still device-only SecureStore. Server-side trial tracking needs a `profiles.plan_selected`/trial column + read it in `AppNavigator`/`useSubscription`. Left for a dedicated change.

### Backend
- [x] `check_and_increment_daily_scan` — was **missing** from migrations (would 500 every scan). Added `supabase/migrations/20260602000000_daily_scans.sql` (creates `daily_scans` table + the SECURITY DEFINER function: premium = unlimited, free = 3/day, atomic increment).
- [x] `increment_rate_limit` — confirmed present in `supabase/migrations/20260529000000_rate_limit.sql`.
- [ ] **External/ops:** Resend sender domain `noreply@coinseek.app` must be verified in the Resend dashboard (cannot be done from the repo). Also needed by the new `export-data` function.

### Android Build Config
- [x] `android.versionCode: 1` — already present in `app.json`.
- [x] `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` — already removed; `permissions` is `["CAMERA"]` only.
- [x] `android.targetSdkVersion: 34` — already present in `app.json`.

---

## 🟡 MEDIUM — Important but not day-one blockers

> Solid improvements that should land shortly after or alongside launch.
> Delegate prompt: *"Work through the MEDIUM section of CHECKLIST.md. Read each referenced file before making changes. Fix all items."*

### Navigation & Screens
- [x] `SubscriptionManagementScreen.handleUpgrade()` — fixed to pass `'yearly'` explicitly to both upgrade buttons
- [x] Old `SubscriptionScreen.js` — deleted (was unreachable and showed wrong prices/dates)
- [x] "Portfolio Value" — now navigates to the Collection tab which shows the full portfolio breakdown

### Features
- [x] "Save Scans to Gallery" toggle — wired to `toggleSaveScansToGallery` Redux action (persists in settings slice); actual file-save implementation deferred until `expo-media-library` is installed
- [x] Biometric lock toggle — removed from `PrivacySecurityScreen` (was already gone in linter pass; `expo-local-authentication` not installed)
- [x] Wishlist screen — built `src/screens/WishlistScreen.js`, registered in `ProfileStack`, entry point added to ProfileScreen under COLLECTION section
- [x] `assessPhotoQuality()` — left as graceful null return; UI already handles `score === null` correctly; real implementation requires ML work
- [x] `advancedFilters` and `errorDetection` — removed from `FEATURE_CONFIG` in `useFeatureAccess.js` (commented out pending UI implementation)

### Security / Data
- [x] Scan counter mismatch — clarified with comment in `useScanLimit.js`; `clearAllData()` only touches AsyncStorage while counter is in SecureStore so they don't actually conflict; server is the real guard
- [x] `.env` in `.gitignore` — already present, no change needed

---

## 🟢 LOW — Polish and cleanup

> Nice-to-haves and dead code removal. Good for a dedicated cleanup session.
> Delegate prompt: *"Work through the LOW section of CHECKLIST.md. Read each referenced file before making changes. Fix all items."*

- [x] "Login Alerts" toggle updates local state only — subtitle updated to "Coming soon — sign-in notifications are not yet active" (`src/screens/PrivacySecurityScreen.js`)
- [x] Delete dead `SettingsScreen.js` — file not found; already deleted in a prior session
- [x] Remove dead `mockIdentifyCoin()` function and unused `COIN_DATABASE` import from `coinIdentification.js` (`src/services/coinIdentification.js:73-94`)
- [x] `HistoryScreen` navigates to Results with raw history items — `normalizeHistoryItem()` helper added to fill in safe defaults before navigation (`src/screens/HistoryScreen.js`)
- [x] `useCollectionSync` doesn't cancel pending debounced upserts on logout — `cancelled` flag added; cleanup returns `() => { cancelled = true }` (`src/hooks/useCollectionSync.js`)
- [x] `getCoinValueTrends()` always returns `null` — already has clear comment explaining why; no change needed (function kept to avoid broken imports)
- [x] Splash screen has no branded loading state — `LoadingScreen` updated with gold coin icon, "CoinSeek" heading, and small spinner (`src/navigation/AppNavigator.js`)
- [x] `SubscriptionManagementScreen` header uses hardcoded `paddingTop: 52` — replaced with `useSafeAreaInsets` dynamic padding (`src/screens/SubscriptionManagementScreen.js`)
- [ ] App Check / attestation is a placeholder — deferred; requires `expo-app-integrity` SDK 54 support before implementing JWT verification (`src/services/appCheckService.js`) — MANUAL: implement when SDK 54 is released
- [x] `app.json` iOS bundle ID mismatch — already unified to `com.coinseek.app` for both platforms in a prior session

---

## Context for Claude

> Include this section when attaching this file to any new Claude session.

- **App name:** CoinSeek — a coin identification and collection management app
- **Platform:** React Native + Expo SDK 51, Android-only for now (iOS deferred)
- **Auth:** Supabase via a custom `auth-proxy` edge function — NOT the direct Supabase Auth SDK
- **Payments:** Stripe Checkout (opens in browser), handled by `create-checkout` + `stripe-webhook` + `verify-session` edge functions
- **AI / Core feature:** Google Gemini via `identify-coin` edge function — this IS the product, treat it as critical
- **Theme:** Dark OLED, metallic gold primary (`#f2ca50`), Libre Caslon Text (serif headings) + Manrope (sans body)
- **Navigation:** React Navigation — bottom tabs (Scan, Collection, Profile) with nested native stacks per tab
- **State management:** Redux Toolkit (collection, history, settings slices) + Supabase for cloud sync
- **Key files:**
  - `src/navigation/AppNavigator.js` — all navigation logic, auth gating, and paywall routing
  - `src/auth/AuthContext.js` — session management and deep link callback handling
  - `src/theme/index.js` — all design tokens (colors, fonts, spacing, borderRadius, shadows)
  - `src/screens/PlanSelectionScreen.js` — paywall, shown once after first signup
  - `src/hooks/useStripePayment.js` — Stripe Checkout flow
  - `src/hooks/useSubscription.js` — subscription status throughout the app
  - `src/hooks/useFeatureAccess.js` — free vs premium feature gating
  - `src/hooks/useScanLimit.js` — daily scan counter for free users
  - `supabase/functions/auth-proxy/index.ts` — signup, signin, password reset
  - `supabase/functions/identify-coin/index.ts` — Gemini AI coin identification
  - `supabase/functions/create-checkout/index.ts` — Stripe checkout session creation
  - `supabase/functions/stripe-webhook/index.ts` — handles Stripe subscription events
  - `supabase/functions/send-trial-reminder/index.ts` — trial expiry emails (never scheduled)
  - `supabase/functions/delete-account/index.ts` — GDPR account deletion
