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
    <section className="relative z-10 px-8 py-12 border-b border-[rgba(255,184,0,0.08)]">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="flex-1 h-px bg-[rgba(255,184,0,0.08)]" />
          <span className="font-mono text-[10px] text-[rgba(255,184,0,0.7)] tracking-[2px]">
            // HOW IT WORKS
          </span>
          <div className="flex-1 h-px bg-[rgba(255,184,0,0.08)]" />
        </div>
        <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative text-center">
              <div className="font-outfit font-black text-[64px] text-[rgba(255,184,0,0.06)] leading-none tracking-[-3px] mb-[-8px]">
                {step.num}
              </div>
              <h3 className="text-[14px] font-bold text-white mb-1.5">{step.title}</h3>
              <p className="text-[12px] text-[#888] leading-relaxed font-light">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-3 top-7 font-mono text-[rgba(255,184,0,0.2)] text-lg max-md:hidden">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
