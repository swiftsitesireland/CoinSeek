import WaitlistForm from './WaitlistForm'

export default function BottomCTA() {
  return (
    <section className="relative z-10 px-8 py-16">
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
        <p className="font-mono text-[10px] text-[rgba(255,184,0,0.45)] tracking-[2px] mb-4">
          // JOIN THE WAITLIST
        </p>
        <h2 className="font-outfit font-black text-[40px] tracking-[-2px] text-white mb-1.5 max-md:text-[30px]">
          Be First to <span className="text-[#FFB800]">Know.</span>
        </h2>
        <p className="text-[13px] text-[#888] mb-6 font-light">
          We&apos;ll notify you the moment the app launches. No spam, ever.
        </p>
        <WaitlistForm buttonText="→ NOTIFY ME" />
      </div>
    </section>
  )
}
