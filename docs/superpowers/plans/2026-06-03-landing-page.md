# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Neo-Tech single-page waitlist site in `landing/` that captures email + platform (iOS/Android) into Supabase and deploys to Vercel.

**Architecture:** Next.js 14 App Router in a new `landing/` folder at the repo root. A server-side API route (`POST /api/waitlist`) handles Supabase inserts using the service role key — never exposed to the browser. A single shared `WaitlistForm` client component is used in both the Hero and BottomCTA sections. All other components are server components.

**Tech Stack:** Next.js 14, Tailwind CSS 3, TypeScript, `@supabase/supabase-js` v2, Jest + ts-jest (validation tests only), Vercel deployment.

---

## File Map

```
landing/
├── .gitignore
├── .env.example
├── .env.local                         ← copy SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from root .env
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── jest.config.ts
├── app/
│   ├── layout.tsx                     ← fonts (Outfit + DM Mono), metadata, body class
│   ├── page.tsx                       ← assembles all sections, grid-bg overlay
│   ├── globals.css                    ← Tailwind directives, grid-bg class, CSS vars
│   └── api/
│       └── waitlist/
│           └── route.ts              ← POST handler: validate → upsert → respond
├── components/
│   ├── Nav.tsx                        ← logo + BETA SOON badge, no links
│   ├── Hero.tsx                       ← headline, WaitlistForm, CoinWidget (internal)
│   ├── Stats.tsx                      ← 3-stat horizontal strip
│   ├── Features.tsx                   ← 3-cell bordered grid
│   ├── HowItWorks.tsx                 ← 3 steps with ghost numbers + arrows
│   ├── BottomCTA.tsx                  ← repeat headline + WaitlistForm
│   ├── Footer.tsx                     ← muted logo + © 2026
│   └── WaitlistForm.tsx               ← 'use client', email input + platform select + submit
└── lib/
    ├── types.ts                       ← WaitlistEntry, WaitlistResponse interfaces
    ├── validation.ts                  ← pure validateWaitlistInput function (testable)
    ├── supabase.ts                    ← server-side createClient (service role key)
    └── __tests__/
        └── validation.test.ts        ← Jest tests for validateWaitlistInput
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `landing/package.json`
- Create: `landing/tsconfig.json`
- Create: `landing/next.config.ts`
- Create: `landing/tailwind.config.ts`
- Create: `landing/postcss.config.mjs`
- Create: `landing/jest.config.ts`
- Create: `landing/.gitignore`
- Create: `landing/.env.example`

- [ ] **Step 1: Create `landing/package.json`**

```json
{
  "name": "coin-collector-landing",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "postcss": "^8",
    "autoprefixer": "^10",
    "jest": "^29",
    "@types/jest": "^29",
    "ts-jest": "^29"
  }
}
```

- [ ] **Step 2: Create `landing/tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `landing/next.config.ts`**

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {}

export default config
```

- [ ] **Step 4: Create `landing/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        amber: '#FFB800',
        surface: '#0d0d0d',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Create `landing/postcss.config.mjs`**

```mjs
const config = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
export default config
```

- [ ] **Step 6: Create `landing/jest.config.ts`**

```ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default config
```

- [ ] **Step 7: Create `landing/.gitignore`**

```
.next/
node_modules/
.env.local
```

- [ ] **Step 8: Create `landing/.env.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 9: Install dependencies**

Run from inside `landing/`:
```bash
cd landing && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 10: Commit**

```bash
git add landing/
git commit -m "chore: scaffold landing Next.js project"
```

---

## Task 2: Supabase Table

**Files:**
- Run SQL in Supabase dashboard (no file created)
- Create: `landing/lib/types.ts`
- Create: `landing/lib/supabase.ts`

- [ ] **Step 1: Create the waitlist table in Supabase**

Open your Supabase project → SQL Editor → run:

```sql
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  platform text check (platform in ('ios', 'android')),
  created_at timestamptz default now()
);

create index if not exists waitlist_email_idx on waitlist (email);
```

Expected: table appears in Table Editor with columns `id`, `email`, `platform`, `created_at`.

- [ ] **Step 2: Create `landing/lib/types.ts`**

```ts
export interface WaitlistEntry {
  email: string
  platform: 'ios' | 'android' | null
}

export interface WaitlistResponse {
  success: boolean
  error?: string
}
```

- [ ] **Step 3: Create `landing/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

- [ ] **Step 4: Create `landing/.env.local`**

Copy values from the root `.env` file:

```
SUPABASE_URL=<paste from root .env>
SUPABASE_SERVICE_ROLE_KEY=<paste from root .env>
```

This file is gitignored — do not commit it.

- [ ] **Step 5: Commit**

```bash
git add landing/lib/
git commit -m "feat: add Supabase client and types for waitlist"
```

---

## Task 3: Validation Logic + Tests (TDD)

**Files:**
- Create: `landing/lib/validation.ts`
- Create: `landing/lib/__tests__/validation.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `landing/lib/__tests__/validation.test.ts`:

```ts
import { validateWaitlistInput } from '../validation'

describe('validateWaitlistInput', () => {
  it('accepts valid email with no platform', () => {
    expect(validateWaitlistInput({ email: 'test@example.com' }))
      .toEqual({ email: 'test@example.com', platform: null })
  })

  it('accepts valid email with ios platform', () => {
    expect(validateWaitlistInput({ email: 'user@test.com', platform: 'ios' }))
      .toEqual({ email: 'user@test.com', platform: 'ios' })
  })

  it('accepts valid email with android platform', () => {
    expect(validateWaitlistInput({ email: 'user@test.com', platform: 'android' }))
      .toEqual({ email: 'user@test.com', platform: 'android' })
  })

  it('accepts null platform explicitly', () => {
    expect(validateWaitlistInput({ email: 'test@example.com', platform: null }))
      .toEqual({ email: 'test@example.com', platform: null })
  })

  it('lowercases and trims email', () => {
    expect(validateWaitlistInput({ email: '  TEST@EXAMPLE.COM  ' }))
      .toEqual({ email: 'test@example.com', platform: null })
  })

  it('rejects missing email', () => {
    expect(validateWaitlistInput({})).toEqual({ error: 'Valid email required' })
  })

  it('rejects invalid email format', () => {
    expect(validateWaitlistInput({ email: 'notanemail' }))
      .toEqual({ error: 'Valid email required' })
  })

  it('rejects invalid platform value', () => {
    expect(validateWaitlistInput({ email: 'test@example.com', platform: 'windows' }))
      .toEqual({ error: 'Invalid platform' })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd landing && npm test
```

Expected: FAIL with `Cannot find module '../validation'`

- [ ] **Step 3: Create `landing/lib/validation.ts`**

```ts
import type { WaitlistEntry } from './types'

type ValidationSuccess = WaitlistEntry
type ValidationError = { error: string }

export function validateWaitlistInput(body: unknown): ValidationSuccess | ValidationError {
  if (!body || typeof body !== 'object') return { error: 'Valid email required' }

  const { email: rawEmail, platform } = body as Record<string, unknown>
  const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Valid email required' }
  }

  if (platform !== undefined && platform !== null && platform !== 'ios' && platform !== 'android') {
    return { error: 'Invalid platform' }
  }

  return { email, platform: (platform as 'ios' | 'android' | null) ?? null }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd landing && npm test
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add landing/lib/validation.ts landing/lib/__tests__/
git commit -m "feat: add waitlist input validation with tests"
```

---

## Task 4: API Route

**Files:**
- Create: `landing/app/api/waitlist/route.ts`

- [ ] **Step 1: Create `landing/app/api/waitlist/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateWaitlistInput } from '@/lib/validation'
import type { WaitlistResponse } from '@/lib/types'

export async function POST(req: NextRequest): Promise<NextResponse<WaitlistResponse>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const result = validateWaitlistInput(body)

  if ('error' in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
  }

  const { error } = await supabase
    .from('waitlist')
    .upsert({ email: result.email, platform: result.platform }, { onConflict: 'email' })

  if (error) {
    console.error('Supabase upsert error:', error.message)
    return NextResponse.json({ success: false, error: 'Failed to save. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add landing/app/api/
git commit -m "feat: add POST /api/waitlist route with Supabase upsert"
```

---

## Task 5: Global Styles + Layout

**Files:**
- Create: `landing/app/globals.css`
- Create: `landing/app/layout.tsx`

- [ ] **Step 1: Create `landing/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

.grid-bg {
  background-image:
    linear-gradient(rgba(255, 184, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 184, 0, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

- [ ] **Step 2: Create `landing/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Outfit, DM_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-outfit',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
})

export const metadata: Metadata = {
  title: 'Coin Collector — Identify Any Coin Instantly',
  description:
    'AI-powered coin identification. Point your camera at any coin and instantly know its name, rarity, and market value. Join the waitlist.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${dmMono.variable} font-outfit bg-[#0d0d0d] text-white antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add landing/app/globals.css landing/app/layout.tsx
git commit -m "feat: add global styles and root layout with fonts"
```

---

## Task 6: WaitlistForm Component

**Files:**
- Create: `landing/components/WaitlistForm.tsx`

- [ ] **Step 1: Create `landing/components/WaitlistForm.tsx`**

```tsx
'use client'

import { useState, FormEvent } from 'react'
import type { WaitlistResponse } from '@/lib/types'

interface Props {
  buttonText?: string
}

export default function WaitlistForm({ buttonText = '→ JOIN WAITLIST' }: Props) {
  const [email, setEmail] = useState('')
  const [platform, setPlatform] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, platform: platform || null }),
    })

    const data: WaitlistResponse = await res.json()

    if (data.success) {
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMsg(data.error ?? 'Something went wrong. Try again.')
    }
  }

  if (status === 'success') {
    return (
      <p className="font-mono text-[#FFB800] text-sm tracking-[3px] py-4">
        // YOU'RE ON THE LIST
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-sm">
      <div className="flex border border-[rgba(255,184,0,0.2)] rounded-[3px] overflow-hidden">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="
            bg-[rgba(255,184,0,0.02)] border-none text-[#ccc] font-mono text-sm
            px-4 py-3 outline-none flex-1 placeholder:text-[#333] min-w-0
          "
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="
            bg-[#FFB800] text-[#0d0d0d] font-mono text-[11px] font-medium
            px-5 tracking-[1px] cursor-pointer disabled:opacity-60
            whitespace-nowrap transition-opacity
          "
        >
          {status === 'loading' ? '→ SENDING...' : buttonText}
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[9px] text-[#444] tracking-[2px] shrink-0">I'M ON</span>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="
            bg-[rgba(255,184,0,0.03)] border border-[rgba(255,184,0,0.18)]
            rounded-[3px] text-[#888] font-mono text-[10px]
            py-1.5 px-2.5 outline-none cursor-pointer appearance-none min-w-[110px]
          "
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23FFB80066' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '24px',
          }}
        >
          <option value="">Select platform</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
        </select>
      </div>

      {status === 'error' && (
        <p className="font-mono text-[10px] text-[#FFB800] opacity-70 tracking-wide">
          {errorMsg}
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add landing/components/WaitlistForm.tsx
git commit -m "feat: add WaitlistForm component with platform select and loading/success states"
```

---

## Task 7: Nav + Footer

**Files:**
- Create: `landing/components/Nav.tsx`
- Create: `landing/components/Footer.tsx`

- [ ] **Step 1: Create `landing/components/Nav.tsx`**

```tsx
export default function Nav() {
  return (
    <nav className="relative z-10 flex justify-between items-center px-8 py-4 border-b border-[rgba(255,184,0,0.08)]">
      <span className="font-mono text-[#FFB800] text-[13px] tracking-[2px]">
        COIN//COLLECTOR
      </span>
      <span className="border border-[rgba(255,184,0,0.3)] text-[#FFB800] font-mono text-[9px] px-2.5 py-1 rounded-[2px] tracking-[1px]">
        BETA SOON
      </span>
    </nav>
  )
}
```

- [ ] **Step 2: Create `landing/components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[rgba(255,184,0,0.08)] px-8 py-4 flex justify-between items-center">
      <span className="font-mono text-[#2a2a2a] text-[10px] tracking-[2px]">
        COIN//COLLECTOR
      </span>
      <span className="font-mono text-[9px] text-[#222]">© 2026</span>
    </footer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add landing/components/Nav.tsx landing/components/Footer.tsx
git commit -m "feat: add Nav and Footer components"
```

---

## Task 8: Hero Section

**Files:**
- Create: `landing/components/Hero.tsx`

- [ ] **Step 1: Create `landing/components/Hero.tsx`**

```tsx
import WaitlistForm from './WaitlistForm'

export default function Hero() {
  return (
    <section className="relative z-10 px-8 py-12 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start border-b border-[rgba(255,184,0,0.08)]">
      <div>
        <p className="font-mono text-[10px] text-[rgba(255,184,0,0.45)] tracking-[3px] mb-3.5 uppercase">
          // AI-POWERED NUMISMATIC INTELLIGENCE
        </p>
        <h1 className="font-outfit font-black leading-[0.92] tracking-[-4px] text-white mb-1.5 text-[72px] max-md:text-[48px]">
          IDENTIFY
        </h1>
        <h1 className="font-outfit font-black leading-[0.92] tracking-[-4px] text-[#FFB800] mb-6 text-[72px] max-md:text-[48px]">
          ANY COIN.
        </h1>
        <p className="text-[14px] text-[#4a4a4a] leading-relaxed max-w-[380px] mb-6 font-light">
          Point your camera. Our AI instantly names the coin, scores its rarity,
          and tells you what it&apos;s worth — ancient to modern.
        </p>
        <WaitlistForm buttonText="→ JOIN WAITLIST" />
        <p className="font-mono text-[9px] text-[#2a2a2a] tracking-[0.5px] mt-3">
          No spam, ever.
        </p>
      </div>

      <div className="max-md:hidden pt-2 shrink-0">
        <CoinWidget />
      </div>
    </section>
  )
}

function CoinWidget() {
  return (
    <div>
      <div className="relative w-40 h-40 rounded-full border border-[rgba(255,184,0,0.15)] flex items-center justify-center">
        <div className="absolute inset-3.5 rounded-full border border-dashed border-[rgba(255,184,0,0.08)]" />
        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFB800] to-transparent top-10 shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
        {/* Corner brackets */}
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-[rgba(255,184,0,0.4)] rounded-tl-sm" />
        <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-[rgba(255,184,0,0.4)] rounded-tr-sm" />
        <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-[rgba(255,184,0,0.4)] rounded-bl-sm" />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-[rgba(255,184,0,0.4)] rounded-br-sm" />
        <span className="font-outfit font-black text-[56px] text-[rgba(255,184,0,0.1)]">¢</span>
      </div>
      <div className="mt-3 bg-[rgba(255,184,0,0.04)] border border-[rgba(255,184,0,0.12)] rounded p-2.5 font-mono text-[9px] w-40">
        <p className="text-[#FFB800] mb-1">→ SCAN COMPLETE</p>
        <p className="text-[#444]">Coin: <span className="text-[#888]">1921 Morgan Dollar</span></p>
        <p className="text-[#444]">Grade: <span className="text-[#888]">MS-63</span></p>
        <p className="text-[#444]">Value: <span className="text-[#888]">$85 – $140</span></p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add landing/components/Hero.tsx
git commit -m "feat: add Hero section with CoinWidget"
```

---

## Task 9: Stats + Features Sections

**Files:**
- Create: `landing/components/Stats.tsx`
- Create: `landing/components/Features.tsx`

- [ ] **Step 1: Create `landing/components/Stats.tsx`**

```tsx
const STATS = [
  { value: '15k+', label: 'COINS IN DATABASE' },
  { value: '<2s', label: 'AVERAGE SCAN TIME' },
  { value: '98%', label: 'IDENTIFICATION ACCURACY' },
]

export default function Stats() {
  return (
    <div className="relative z-10 grid grid-cols-3 border-b border-[rgba(255,184,0,0.08)]">
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className={`px-8 py-5 ${i < STATS.length - 1 ? 'border-r border-[rgba(255,184,0,0.08)]' : ''}`}
        >
          <div className="font-outfit font-black text-[36px] text-[#FFB800] leading-none mb-1">
            {stat.value}
          </div>
          <div className="font-mono text-[9px] text-[#444] tracking-[1px]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `landing/components/Features.tsx`**

```tsx
const FEATURES = [
  {
    num: '01',
    title: 'AI Recognition',
    desc: 'Point your camera at any coin and get instant identification from 15,000+ coins spanning ancient to modern.',
  },
  {
    num: '02',
    title: 'Collection Manager',
    desc: 'Build and track your full collection. Every coin catalogued, valued, and organized in one place.',
  },
  {
    num: '03',
    title: 'Market Value',
    desc: 'Live rarity scores and pricing data so you always know what your collection is worth.',
  },
]

export default function Features() {
  return (
    <section className="relative z-10 px-8 py-10 border-b border-[rgba(255,184,0,0.08)]">
      <div className="flex items-center gap-3 mb-7">
        <span className="font-mono text-[10px] text-[rgba(255,184,0,0.5)] tracking-[2px]">
          // FEATURES
        </span>
        <div className="flex-1 h-px bg-[rgba(255,184,0,0.08)]" />
      </div>
      <div className="grid grid-cols-3 gap-px bg-[rgba(255,184,0,0.08)] border border-[rgba(255,184,0,0.08)] rounded overflow-hidden max-md:grid-cols-1">
        {FEATURES.map((f) => (
          <div key={f.num} className="bg-[#0d0d0d] px-5 py-6">
            <p className="font-mono text-[10px] text-[rgba(255,184,0,0.3)] mb-3 tracking-[1px]">
              {f.num} //
            </p>
            <h3 className="text-[15px] font-bold text-white mb-2 tracking-[-0.3px]">
              {f.title}
            </h3>
            <p className="text-[12px] text-[#444] leading-relaxed font-light">{f.desc}</p>
            <div className="w-6 h-0.5 bg-[#FFB800] mt-3.5" />
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add landing/components/Stats.tsx landing/components/Features.tsx
git commit -m "feat: add Stats and Features sections"
```

---

## Task 10: HowItWorks + BottomCTA Sections

**Files:**
- Create: `landing/components/HowItWorks.tsx`
- Create: `landing/components/BottomCTA.tsx`

- [ ] **Step 1: Create `landing/components/HowItWorks.tsx`**

```tsx
const STEPS = [
  {
    num: '01',
    title: 'Point',
    desc: 'Open the app and aim your camera at any coin — no special setup needed.',
  },
  {
    num: '02',
    title: 'Snap',
    desc: 'Tap to scan. Our AI processes the image in under 2 seconds.',
  },
  {
    num: '03',
    title: 'Know',
    desc: 'Instant results: name, date, mint, rarity grade, and estimated market value.',
  },
]

export default function HowItWorks() {
  return (
    <section className="relative z-10 px-8 py-10 border-b border-[rgba(255,184,0,0.08)]">
      <div className="flex items-center gap-3 mb-7">
        <span className="font-mono text-[10px] text-[rgba(255,184,0,0.5)] tracking-[2px]">
          // HOW IT WORKS
        </span>
        <div className="flex-1 h-px bg-[rgba(255,184,0,0.08)]" />
      </div>
      <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
        {STEPS.map((step, i) => (
          <div key={step.num} className="relative">
            <div className="font-outfit font-black text-[64px] text-[rgba(255,184,0,0.06)] leading-none tracking-[-3px] mb-[-8px]">
              {step.num}
            </div>
            <h3 className="text-[14px] font-bold text-white mb-1.5">{step.title}</h3>
            <p className="text-[12px] text-[#444] leading-relaxed font-light">{step.desc}</p>
            {i < STEPS.length - 1 && (
              <span className="absolute -right-3 top-7 font-mono text-[rgba(255,184,0,0.2)] text-lg max-md:hidden">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create `landing/components/BottomCTA.tsx`**

```tsx
import WaitlistForm from './WaitlistForm'

export default function BottomCTA() {
  return (
    <section className="relative z-10 px-8 py-12 flex flex-col items-center text-center">
      <p className="font-mono text-[10px] text-[rgba(255,184,0,0.45)] tracking-[2px] mb-4">
        // JOIN THE WAITLIST
      </p>
      <h2 className="font-outfit font-black text-[40px] tracking-[-2px] text-white mb-1.5 max-md:text-[30px]">
        Be First to <span className="text-[#FFB800]">Know.</span>
      </h2>
      <p className="text-[13px] text-[#444] mb-6 font-light">
        We&apos;ll notify you the moment the app launches. No spam, ever.
      </p>
      <WaitlistForm buttonText="→ NOTIFY ME" />
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add landing/components/HowItWorks.tsx landing/components/BottomCTA.tsx
git commit -m "feat: add HowItWorks and BottomCTA sections"
```

---

## Task 11: Page Assembly

**Files:**
- Create: `landing/app/page.tsx`

- [ ] **Step 1: Create `landing/app/page.tsx`**

```tsx
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Stats from '@/components/Stats'
import Features from '@/components/Features'
import HowItWorks from '@/components/HowItWorks'
import BottomCTA from '@/components/BottomCTA'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <div className="grid-bg fixed inset-0 pointer-events-none z-[-1]" />
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <BottomCTA />
      <Footer />
    </main>
  )
}
```

- [ ] **Step 2: Start the dev server and verify the page loads**

```bash
cd landing && npm run dev
```

Open `http://localhost:3000`. Verify:
- Grid background visible on dark canvas
- All sections render top-to-bottom: Nav → Hero → Stats → Features → How It Works → BottomCTA → Footer
- Amber `#FFB800` accents visible on IDENTIFY, stats, feature bars, section tags
- No console errors

- [ ] **Step 3: Test the form end-to-end**

1. Enter a real email in the Hero form
2. Select a platform from the dropdown
3. Click `→ JOIN WAITLIST`
4. Verify: button shows `→ SENDING...` then form replaced with `// YOU'RE ON THE LIST`
5. Open Supabase Table Editor → `waitlist` table → confirm row inserted with correct email, platform, timestamp

- [ ] **Step 4: Test duplicate email**

Submit the same email again. Verify: no error, shows success, Supabase row's `created_at` is updated (upsert worked).

- [ ] **Step 5: Commit**

```bash
git add landing/app/page.tsx
git commit -m "feat: assemble landing page — all sections wired"
```

---

## Task 12: Responsive Polish

**Files:**
- Modify: `landing/components/Stats.tsx`
- Modify: `landing/components/Hero.tsx` (already has max-md classes — verify only)

- [ ] **Step 1: Verify mobile layout at 375px**

In your browser, open DevTools → set viewport to 375px wide. Check:

| Item | Expected |
|------|----------|
| Hero headline | ~48px, single column |
| CoinWidget | hidden |
| Email form | full width |
| Stats bar | 3 columns still visible (may be tight) |
| Features grid | stacked single column |
| How It Works | stacked single column |

- [ ] **Step 2: Fix Stats on mobile — stack to single column**

Edit `landing/components/Stats.tsx` — change the grid class:

```tsx
// Change this line:
<div className="relative z-10 grid grid-cols-3 border-b border-[rgba(255,184,0,0.08)]">

// To:
<div className="relative z-10 grid grid-cols-3 max-md:grid-cols-1 border-b border-[rgba(255,184,0,0.08)]">
```

Also update the border logic so mobile stats have bottom borders instead of right borders:

```tsx
className={`px-8 py-5 ${
  i < STATS.length - 1
    ? 'border-r border-[rgba(255,184,0,0.08)] max-md:border-r-0 max-md:border-b max-md:border-[rgba(255,184,0,0.08)]'
    : ''
}`}
```

- [ ] **Step 3: Re-verify at 375px, 768px, and 1280px**

All three breakpoints should look intentional — no overflowing content, no horizontal scroll.

- [ ] **Step 4: Commit**

```bash
git add landing/components/Stats.tsx
git commit -m "fix: stack stats to single column on mobile"
```

---

## Task 13: Deploy to Vercel

- [ ] **Step 1: Push the landing/ folder to your Git remote**

If not already pushed:
```bash
git push origin master
```

- [ ] **Step 2: Create a new Vercel project**

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your repo
3. **Important:** Change the **Root Directory** setting to `landing` (not the repo root)
4. Framework preset: **Next.js** (auto-detected)

- [ ] **Step 3: Add environment variables in Vercel**

In the project settings → Environment Variables, add:
- `SUPABASE_URL` — value from your root `.env`
- `SUPABASE_SERVICE_ROLE_KEY` — value from your root `.env`

- [ ] **Step 4: Deploy**

Click Deploy. Wait for build to complete.

Expected: Vercel provides a `*.vercel.app` URL. Visit it and run the same end-to-end form test as Task 11 Step 3 — confirm a signup lands in Supabase from the live URL.

- [ ] **Step 5: Commit deploy confirmation**

```bash
git commit --allow-empty -m "chore: landing page live on Vercel"
```

---

## Self-Review Checklist

- [x] **Nav** — logo + badge only, no links ✓
- [x] **Hero** — headline, subtext, WaitlistForm with platform select, CoinWidget, "No spam" note ✓
- [x] **Stats** — 3 stats with amber numbers ✓
- [x] **Features** — 3 cells, `01 //` numbering, amber accent bars ✓
- [x] **How It Works** — ghost numbers, arrows between steps ✓
- [x] **BottomCTA** — duplicate form with `→ NOTIFY ME`, amber `Know.` ✓
- [x] **Footer** — muted wordmark + © 2026, no "coming soon" text ✓
- [x] **API route** — validates via `validateWaitlistInput`, upserts on email conflict ✓
- [x] **Form behaviour** — loading state, success replacement, inline error, optional platform ✓
- [x] **Responsive** — hero single-column + no coin widget on mobile, stats stack, features stack ✓
- [x] **No nav links anywhere** ✓
- [x] **Service role key server-side only** ✓
- [x] **Tests cover all validation cases** ✓
