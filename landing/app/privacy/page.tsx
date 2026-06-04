import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Coin Seek',
  description: 'How Coin Seek collects, uses, and protects your personal data.',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="border-b border-[rgba(255,184,0,0.08)] px-8 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-mono text-[#FFB800] text-sm tracking-[3px] hover:opacity-80 transition-opacity">
            COIN//SEEK
          </Link>
          <Link href="/" className="font-mono text-[11px] text-[#888] tracking-[2px] hover:text-[#FFB800] transition-colors">
            ← BACK
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-16">
        <p className="font-mono text-[11px] text-[#FFB800] tracking-[3px] mb-4">// LEGAL</p>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="font-mono text-[11px] text-[#555] tracking-[2px] mb-12">
          LAST UPDATED: JUNE 2026
        </p>

        <div className="space-y-10 text-[#aaa] leading-relaxed text-sm">

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">1. WHO WE ARE</h2>
            <p>
              Coin Seek ("we", "us", "our") is an AI-powered coin identification service. This policy
              explains what personal data we collect when you join our waitlist, how we use it, and your rights
              over it.
            </p>
            <p className="mt-3">
              Contact us any time at{' '}
              <a href="mailto:swiftsitesireland@gmail.com" className="text-[#FFB800] hover:underline">
                swiftsitesireland@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">2. WHAT WE COLLECT</h2>
            <ul className="space-y-2 list-none">
              {[
                ['Email address', 'Provided by you when joining the waitlist.'],
                ['Platform preference', 'iOS or Android — so we can notify you when your platform launches.'],
                ['IP address', 'Captured automatically to enforce rate limits and prevent abuse. Not stored permanently.'],
                ['Usage data', 'Standard server logs (page views, referrers, browser type). No tracking pixels or fingerprinting.'],
              ].map(([item, desc]) => (
                <li key={item} className="flex gap-3">
                  <span className="text-[#FFB800] font-mono shrink-0">→</span>
                  <span><span className="text-white font-medium">{item}:</span> {desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We do <span className="text-white">not</span> collect payment details, passwords, device identifiers,
              or any sensitive personal data at this pre-launch stage.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">3. HOW WE USE YOUR DATA</h2>
            <ul className="space-y-2 list-none">
              {[
                'Send you a one-time notification when the app launches on your platform.',
                'Occasionally share relevant pre-launch updates (you can opt out at any time).',
                'Detect and prevent abuse of our waitlist endpoint.',
                'Understand aggregate interest by platform (iOS vs Android).',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-[#FFB800] font-mono shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We will never sell, rent, or trade your email address to third parties for their marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">4. LEGAL BASIS (GDPR)</h2>
            <p>
              If you are in the European Economic Area, our legal basis for processing your email is your
              explicit <strong className="text-white">consent</strong>, given when you submit the waitlist form.
              You may withdraw consent at any time (see Section 6).
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">5. DATA STORAGE &amp; SECURITY</h2>
            <p>
              Waitlist data is stored in <strong className="text-white">Supabase</strong>, a SOC 2 Type II
              certified cloud database provider. Data is encrypted at rest and in transit (TLS 1.2+).
            </p>
            <p className="mt-3">
              We retain your waitlist entry until the app has launched and you have been notified, or until you
              request deletion — whichever comes first. Server logs are purged automatically within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">6. YOUR RIGHTS</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2 list-none">
              {[
                ['Access', 'Request a copy of the data we hold about you.'],
                ['Correction', 'Ask us to correct inaccurate data.'],
                ['Deletion', 'Ask us to erase your data from the waitlist at any time.'],
                ['Portability', 'Receive your data in a machine-readable format.'],
                ['Objection', 'Object to processing based on legitimate interests.'],
              ].map(([right, desc]) => (
                <li key={right} className="flex gap-3">
                  <span className="text-[#FFB800] font-mono shrink-0">→</span>
                  <span><span className="text-white font-medium">{right}:</span> {desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email{' '}
              <a href="mailto:swiftsitesireland@gmail.com" className="text-[#FFB800] hover:underline">
                swiftsitesireland@gmail.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">7. COOKIES</h2>
            <p>
              This landing page does not use advertising or tracking cookies. No third-party analytics scripts
              are loaded. The only browser storage used is a temporary rate-limit counter in{' '}
              <code className="text-[#FFB800] text-xs">localStorage</code>, which expires automatically and
              contains no personal data.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">8. THIRD-PARTY SERVICES</h2>
            <p className="mb-3">We use the following sub-processors:</p>
            <ul className="space-y-2 list-none">
              {[
                ['Supabase', 'Database and authentication infrastructure.', 'https://supabase.com/privacy'],
                ['Vercel', 'Hosting and edge delivery.', 'https://vercel.com/legal/privacy-policy'],
              ].map(([name, role, url]) => (
                <li key={name} className="flex gap-3">
                  <span className="text-[#FFB800] font-mono shrink-0">→</span>
                  <span>
                    <span className="text-white font-medium">{name}</span> — {role}{' '}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#FFB800] hover:underline text-xs">
                      Privacy policy ↗
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3 font-mono tracking-wider">9. CHANGES TO THIS POLICY</h2>
            <p>
              We may update this policy as the service evolves. Material changes will be communicated via email
              to waitlist subscribers. Continued use of the service after changes constitutes acceptance.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-[rgba(255,184,0,0.08)] px-8 py-4 mt-8">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <span className="font-mono text-[#2a2a2a] text-[10px] tracking-[2px]">COIN//SEEK</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="font-mono text-[9px] text-[#FFB800] tracking-[1px]">PRIVACY</Link>
            <Link href="/terms" className="font-mono text-[9px] text-[#555] hover:text-[#FFB800] tracking-[1px] transition-colors">TERMS</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
