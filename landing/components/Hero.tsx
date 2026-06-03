import WaitlistForm from './WaitlistForm'

export default function Hero() {
  return (
    <section className="relative z-10 border-b border-[rgba(255,184,0,0.08)] py-20 px-8">
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center">

        {/* Coin icon */}
        <div className="relative w-14 h-14 rounded-full border border-[rgba(255,184,0,0.25)] flex items-center justify-center mb-6 bg-[rgba(255,184,0,0.04)]">
          <div className="absolute inset-2.5 rounded-full border border-dashed border-[rgba(255,184,0,0.1)]" />
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFB800] to-transparent top-4 shadow-[0_0_6px_rgba(255,184,0,0.4)]" />
          <div className="absolute -top-px -left-px w-2.5 h-2.5 border-t border-l border-[rgba(255,184,0,0.4)]" />
          <div className="absolute -top-px -right-px w-2.5 h-2.5 border-t border-r border-[rgba(255,184,0,0.4)]" />
          <div className="absolute -bottom-px -left-px w-2.5 h-2.5 border-b border-l border-[rgba(255,184,0,0.4)]" />
          <div className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b border-r border-[rgba(255,184,0,0.4)]" />
          <span className="font-outfit font-black text-xl text-[rgba(255,184,0,0.4)]">¢</span>
        </div>

        {/* Badge */}
        <div className="flex items-center gap-2 mb-8 border border-[rgba(255,184,0,0.15)] rounded-full px-4 py-1.5 bg-[rgba(255,184,0,0.03)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800]" />
          <span className="font-mono text-[9px] text-[rgba(255,184,0,0.6)] tracking-[2px]">BETA GOES LIVE SOON</span>
        </div>

        {/* Headline */}
        <h1 className="font-outfit font-black text-[72px] max-md:text-[48px] leading-[0.92] tracking-[-4px] text-white mb-1.5">
          IDENTIFY
        </h1>
        <h1 className="font-outfit font-black text-[72px] max-md:text-[48px] leading-[0.92] tracking-[-4px] text-[#FFB800] mb-7">
          ANY COIN.
        </h1>

        {/* Subtext */}
        <p className="text-[14px] text-[#888] leading-relaxed max-w-xs mb-8 font-light">
          Point your camera. Our AI instantly names the coin, scores its rarity,
          and tells you what it&apos;s worth — ancient to modern.
        </p>

        {/* Form */}
        <WaitlistForm buttonText="→ JOIN WAITLIST" />
        <p className="font-mono text-[9px] text-[#666] tracking-[0.5px] mt-3">No spam, ever.</p>


      </div>
    </section>
  )
}
