'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { License } from '@/lib/supabase'

const PRESET_DAYS = [30, 90, 180, 365]

function getRemainingDays(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000 / 60 / 60 / 24)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function genKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `AUTO-${seg()}-${seg()}-${seg()}`
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

export default function DashboardPage() {
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newDays, setNewDays] = useState(90)
  const [creating, setCreating] = useState(false)

  const [extendTarget, setExtendTarget] = useState<License | null>(null)
  const [extendDays, setExtendDays] = useState(90)

  const fetchLicenses = useCallback(async () => {
    const res = await fetch('/api/licenses')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setLicenses(data)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchLicenses() }, [fetchLicenses])

  const handleCreate = async () => {
    if (!newKey) return
    setCreating(true)
    await fetch('/api/licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: newKey, expires_at: addDays(newDays) }),
    })
    setCreating(false)
    setShowCreate(false)
    setNewKey('')
    setNewDays(90)
    fetchLicenses()
  }

  const handleExtend = async () => {
    if (!extendTarget) return
    const newExpiry = new Date(extendTarget.expires_at)
    newExpiry.setDate(newExpiry.getDate() + extendDays)
    await fetch(`/api/licenses/${extendTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expires_at: newExpiry.toISOString() }),
    })
    setExtendTarget(null)
    fetchLicenses()
  }

  const handleToggleActive = async (lic: License) => {
    await fetch(`/api/licenses/${lic.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !lic.is_active }),
    })
    fetchLicenses()
  }

  const handleDelete = async (lic: License) => {
    if (!confirm(`"${lic.license_key}" 을(를) 삭제하시겠습니까?`)) return
    await fetch(`/api/licenses/${lic.id}`, { method: 'DELETE' })
    fetchLicenses()
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <header className="border-b border-white/[0.06] bg-[#0d0d1a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#03C75A] to-[#1ED760] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AutoBrand 관리자</h1>
            <p className="text-[10px] text-zinc-500">라이선스 관리 시스템</p>
          </div>
        </div>
        <button
          onClick={() => { setNewKey(genKey()); setShowCreate(true) }}
          className="bg-gradient-to-r from-[#03C75A] to-[#1ED760] text-white font-semibold text-xs px-4 py-2 rounded-lg hover:opacity-90 active:scale-[0.97] transition-all"
        >
          + 새 라이선스 발급
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-semibold">전체 라이선스</h2>
          <span className="text-xs bg-white/[0.06] text-zinc-400 px-2 py-0.5 rounded-full">{licenses.length}개</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#03C75A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">라이선스 키</th>
                  <th className="text-left px-4 py-3 font-medium">만료일</th>
                  <th className="text-left px-4 py-3 font-medium">남은 기간</th>
                  <th className="text-left px-4 py-3 font-medium">상태</th>
                  <th className="text-right px-5 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic, i) => {
                  const remaining = getRemainingDays(lic.expires_at)
                  const isExpired = remaining < 0
                  const isUrgent = !isExpired && remaining <= 3
                  return (
                    <tr key={lic.id} className={`border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="px-5 py-4 font-mono text-xs text-zinc-200">{lic.license_key}</td>
                      <td className="px-4 py-4 text-zinc-400 text-xs">{formatDate(lic.expires_at)}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold ${isExpired ? 'text-zinc-500' : isUrgent ? 'text-red-400' : 'text-[#03C75A]'}`}>
                          {isExpired ? '만료됨' : `${remaining}일`}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${lic.is_active && !isExpired ? 'bg-[#03C75A]/10 text-[#03C75A]' : 'bg-zinc-700/40 text-zinc-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${lic.is_active && !isExpired ? 'bg-[#03C75A]' : 'bg-zinc-500'}`} />
                          {lic.is_active && !isExpired ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setExtendTarget(lic); setExtendDays(90) }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition-all"
                          >
                            연장
                          </button>
                          <button
                            onClick={() => handleToggleActive(lic)}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${lic.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-[#03C75A]/10 hover:bg-[#03C75A]/20 text-[#03C75A]'}`}
                          >
                            {lic.is_active ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => handleDelete(lic)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {licenses.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-zinc-600 text-sm">등록된 라이선스가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#111120] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-5">새 라이선스 발급</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">라이선스 키</label>
                <div className="flex gap-2">
                  <input
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-mono text-white outline-none focus:border-[#03C75A]/50 transition-all"
                  />
                  <button onClick={() => setNewKey(genKey())} className="text-xs px-3 py-2.5 bg-white/[0.06] rounded-xl hover:bg-white/[0.1] text-zinc-300 transition-all whitespace-nowrap">
                    자동 생성
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">사용 기간</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {PRESET_DAYS.map(d => (
                    <button
                      key={d}
                      onClick={() => setNewDays(d)}
                      className={`text-xs py-2 rounded-lg transition-all ${newDays === d ? 'bg-[#03C75A] text-white' : 'bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1]'}`}
                    >
                      {d}일
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>직접 입력:</span>
                  <input
                    type="number"
                    value={newDays}
                    onChange={e => setNewDays(Number(e.target.value))}
                    className="w-20 bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1 text-white text-xs outline-none"
                  />
                  <span>일</span>
                </div>
              </div>
              <p className="text-xs text-zinc-600">만료일: {formatDate(addDays(newDays))}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-zinc-400 text-sm hover:bg-white/[0.1] transition-all">취소</button>
              <button onClick={handleCreate} disabled={creating || !newKey} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#03C75A] to-[#1ED760] text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all">
                {creating ? '발급 중...' : '발급하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {extendTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setExtendTarget(null)}>
          <div className="bg-[#111120] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">기간 연장</h3>
            <p className="text-xs text-zinc-500 mb-5 font-mono">{extendTarget.license_key}</p>
            <div>
              <label className="block text-xs text-zinc-400 mb-2">추가할 기간</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PRESET_DAYS.map(d => (
                  <button
                    key={d}
                    onClick={() => setExtendDays(d)}
                    className={`text-xs py-2 rounded-lg transition-all ${extendDays === d ? 'bg-[#03C75A] text-white' : 'bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1]'}`}
                  >
                    +{d}일
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>직접 입력:</span>
                <input
                  type="number"
                  value={extendDays}
                  onChange={e => setExtendDays(Number(e.target.value))}
                  className="w-20 bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1 text-white text-xs outline-none"
                />
                <span>일</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setExtendTarget(null)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-zinc-400 text-sm hover:bg-white/[0.1] transition-all">취소</button>
              <button onClick={handleExtend} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#03C75A] to-[#1ED760] text-white text-sm font-semibold hover:opacity-90 transition-all">
                연장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
