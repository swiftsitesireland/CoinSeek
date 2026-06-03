const STATS = [
  { value: 'AI', label: 'INSTANT IDENTIFICATION' },
  { value: '<2s', label: 'AVERAGE SCAN TIME' },
  { value: '∞', label: 'ANCIENT TO MODERN' },
]

export default function Stats() {
  return (
    <div className="relative z-10 border-b border-[rgba(255,184,0,0.08)] px-8 py-8">
      <div className="max-w-2xl mx-auto grid grid-cols-3 max-md:grid-cols-1 gap-px bg-[rgba(255,184,0,0.08)] border border-[rgba(255,184,0,0.08)] rounded overflow-hidden">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-[#0d0d0d] px-6 py-6 text-center">
            <div className="font-outfit font-black text-[36px] text-[#FFB800] leading-none mb-1">
              {stat.value}
            </div>
            <div className="font-mono text-[9px] text-[#888] tracking-[1px]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
