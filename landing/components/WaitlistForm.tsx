'use client'

import { useState, FormEvent } from 'react'
import type { WaitlistResponse } from '@/lib/types'

interface Props {
  buttonText?: string
}

export default function WaitlistForm({ buttonText = '→ JOIN WAITLIST' }: Props) {
  const [email, setEmail] = useState('')
  const [platform, setPlatform] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, platform: platform || null }),
    })

    const data: WaitlistResponse = await res.json()

    if (data.success) {
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMsg(data.error ?? 'Something went wrong. Try again.')
    }
  }

  if (status === 'success') {
    return (
      <p className="font-mono text-[#FFB800] text-sm tracking-[3px] py-4">
        // YOU&apos;RE ON THE LIST
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-sm">
      <div className="flex border border-[rgba(255,184,0,0.2)] rounded-[3px] overflow-hidden">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="bg-[rgba(255,184,0,0.02)] border-none text-[#ccc] font-mono text-sm px-4 py-3 outline-none flex-1 placeholder:text-[#555] min-w-0"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-[#FFB800] text-[#0d0d0d] font-mono text-[11px] font-medium px-5 tracking-[1px] cursor-pointer disabled:opacity-60 whitespace-nowrap transition-opacity"
        >
          {status === 'loading' ? '→ SENDING...' : buttonText}
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[9px] text-[#888] tracking-[2px] shrink-0">I&apos;M ON</span>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="bg-[rgba(255,184,0,0.03)] border border-[rgba(255,184,0,0.18)] rounded-[3px] text-[#888] font-mono text-[10px] py-1.5 px-2.5 outline-none cursor-pointer appearance-none min-w-[110px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23FFB80066' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '24px',
          }}
        >
          <option value="">Select platform</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
        </select>
      </div>

      {status === 'error' && (
        <p className="font-mono text-[10px] text-[#FFB800] opacity-70 tracking-wide">
          {errorMsg}
        </p>
      )}
    </form>
  )
}
