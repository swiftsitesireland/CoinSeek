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
