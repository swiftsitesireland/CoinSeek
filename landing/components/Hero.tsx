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
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFB800] to-transparent top-10 shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
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
