import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[rgba(255,184,0,0.08)] px-8 py-4">
      <div className="max-w-2xl mx-auto flex justify-between items-center">
        <span className="font-mono text-[#555] text-[11px] tracking-[2px]">
          COIN//SEEK
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="font-mono text-[11px] text-[#888] hover:text-[#FFB800] tracking-[1px] transition-colors"
          >
            PRIVACY
          </Link>
          <Link
            href="/terms"
            className="font-mono text-[11px] text-[#888] hover:text-[#FFB800] tracking-[1px] transition-colors"
          >
            TERMS
          </Link>
          <span className="font-mono text-[11px] text-[#555]">© 2026</span>
        </div>
      </div>
    </footer>
  )
}
