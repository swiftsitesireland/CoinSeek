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
