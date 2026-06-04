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

const SITE_URL = 'https://coin-seek-tau.vercel.app'

export const metadata: Metadata = {
  title: 'Coin Seek — Identify Any Coin Instantly',
  description:
    'AI-powered coin identification. Point your camera at any coin and instantly know its name, rarity, and market value. Join the waitlist.',
  metadataBase: new URL(SITE_URL),
  icons: { icon: '/favicon.png' },
  openGraph: {
    title: 'Coin Seek — Identify Any Coin Instantly',
    description:
      'AI-powered coin identification. Point your camera at any coin and instantly know its name, rarity, and market value. Join the waitlist.',
    url: SITE_URL,
    siteName: 'Coin Seek',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coin Seek — Identify Any Coin Instantly',
    description:
      'AI-powered coin identification. Point your camera at any coin and instantly know its name, rarity, and market value. Join the waitlist.',
  },
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
