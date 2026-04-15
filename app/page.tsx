'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
    } else {
      const data = await res.json()
      setError(data.error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#03C75A] to-[#1ED760] mb-4 shadow-lg shadow-[#03C75A]/30">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AutoBrand 관리자</h1>
          <p className="text-zinc-500 text-sm mt-1">라이선스 관리 시스템</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">관리자 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-[#03C75A]/50 focus:ring-1 focus:ring-[#03C75A]/30 transition-all"
              required
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#03C75A] to-[#1ED760] text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
