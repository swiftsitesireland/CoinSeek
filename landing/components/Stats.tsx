const STATS = [
  { value: '15k+', label: 'COINS IN DATABASE' },
  { value: '<2s', label: 'AVERAGE SCAN TIME' },
  { value: '98%', label: 'IDENTIFICATION ACCURACY' },
]

export default function Stats() {
  return (
    <div className="relative z-10 grid grid-cols-3 max-md:grid-cols-1 border-b border-[rgba(255,184,0,0.08)]">
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className={`px-8 py-5 ${
            i < STATS.length - 1
              ? 'border-r border-[rgba(255,184,0,0.08)] max-md:border-r-0 max-md:border-b max-md:border-[rgba(255,184,0,0.08)]'
              : ''
          }`}
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
