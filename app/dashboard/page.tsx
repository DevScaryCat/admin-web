'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { License } from '@/lib/supabase'

const PRESET_DAYS = [30, 90, 180, 365]

type SortKey = 'remaining_asc' | 'remaining_desc' | 'created_desc' | 'name_asc'

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

function StatusBadge({ isActive, isExpired }: { isActive: boolean; isExpired: boolean }) {
  const active = isActive && !isExpired
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 500,
      background: active ? '#f0faf5' : '#f5f5f5',
      border: `1px solid ${active ? '#c3e6d3' : 'var(--border-card)'}`,
      color: active ? '#1a7a4a' : 'var(--text-tertiary)',
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: active ? '#22c55e' : '#d1d5db',
        flexShrink: 0,
      }} />
      {active ? '활성' : '비활성'}
    </span>
  )
}

function RemainingDays({ remaining, isExpired, isUrgent }: { remaining: number; isExpired: boolean; isUrgent: boolean }) {
  if (isExpired) {
    return <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)' }}>만료됨</span>
  }
  const color = isUrgent ? (remaining <= 3 ? '#c0392b' : '#b45309') : 'var(--text-near-black)'
  return (
    <span style={{ fontSize: '13px', fontWeight: 600, color }}>
      {remaining}일
    </span>
  )
}

function ActionButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: 'var(--bg-page)', border: '1px solid var(--border-input)', color: 'var(--text-near-black)' },
    warning: { background: '#fffbf0', border: '1px solid #fde68a', color: '#92400e' },
    danger: { background: '#fff5f5', border: '1px solid #fecaca', color: '#c0392b' },
    success: { background: '#f0faf5', border: '1px solid #c3e6d3', color: '#1a7a4a' },
  }
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
        ...styles[variant],
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  )
}

function Modal({ title, subtitle, onClose, children }: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '24px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '20px',
          padding: '32px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: 'var(--shadow-elevated)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px',
          marginBottom: subtitle ? '4px' : '24px',
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: '24px',
          }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}

function DaySelector({ value, onChange, prefix = '' }: {
  value: number
  onChange: (d: number) => void
  prefix?: string
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {PRESET_DAYS.map(d => (
          <button
            key={d}
            onClick={() => onChange(d)}
            style={{
              padding: '8px 0',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'Inter, sans-serif',
              background: value === d ? '#000000' : 'var(--bg-page)',
              color: value === d ? '#ffffff' : 'var(--text-secondary)',
              border: `1px solid ${value === d ? '#000000' : 'var(--border-input)'}`,
            }}
          >
            {prefix}{d}일
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>직접 입력</label>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '72px',
            background: 'var(--bg-page)',
            border: '1px solid var(--border-input)',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '13px',
            color: 'var(--text-near-black)',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>일</span>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-page)',
  border: '1px solid var(--border-input)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '13px',
  color: 'var(--text-near-black)',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

export default function DashboardPage() {
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newDays, setNewDays] = useState(90)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creating, setCreating] = useState(false)

  const [extendTarget, setExtendTarget] = useState<License | null>(null)
  const [extendDays, setExtendDays] = useState(90)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_desc')

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
      body: JSON.stringify({
        license_key: newKey,
        expires_at: addDays(newDays),
        name: newName || null,
        phone: newPhone || null,
      }),
    })
    setCreating(false)
    setShowCreate(false)
    setNewKey('')
    setNewDays(90)
    setNewName('')
    setNewPhone('')
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

  const activeCount = licenses.filter(l => l.is_active && getRemainingDays(l.expires_at) > 0).length
  const expiredCount = licenses.filter(l => getRemainingDays(l.expires_at) <= 0).length

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = licenses.filter(l => {
      if (!q) return true
      return (
        l.license_key.toLowerCase().includes(q) ||
        (l.name ?? '').toLowerCase().includes(q) ||
        (l.phone ?? '').toLowerCase().includes(q)
      )
    })
    result = [...result].sort((a, b) => {
      if (sortKey === 'remaining_asc') return getRemainingDays(a.expires_at) - getRemainingDays(b.expires_at)
      if (sortKey === 'remaining_desc') return getRemainingDays(b.expires_at) - getRemainingDays(a.expires_at)
      if (sortKey === 'name_asc') return (a.name ?? '').localeCompare(b.name ?? '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return result
  }, [licenses, searchQuery, sortKey])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <header style={{
        background: 'rgba(240,240,243,0.85)',
        borderBottom: '1px solid var(--border-card)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 32px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px', letterSpacing: '-0.5px' }}>A</span>
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                AutoBrand
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                관리자
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' })
                router.push('/')
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-input)',
                borderRadius: '9999px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-page)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
            >
              로그아웃
            </button>
            <button
              onClick={() => { setNewKey(genKey()); setShowCreate(true) }}
              style={{
                background: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.2px',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              + 새 라이선스
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-2px',
            lineHeight: 1.1,
            marginBottom: '8px',
          }}>
            라이선스 관리
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            AutoBrand Connect 사용자 라이선스를 관리합니다.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            { label: '전체 라이선스', value: licenses.length, sub: '등록된 키 수' },
            { label: '활성 라이선스', value: activeCount, sub: '현재 사용 중' },
            { label: '만료된 키', value: expiredCount, sub: '갱신 필요' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'var(--shadow-whisper)',
            }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '4px' }}>
                {stat.value}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-whisper)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-near-black)', letterSpacing: '-0.3px' }}>
                전체 목록
              </h2>
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                background: 'var(--bg-page)',
                border: '1px solid var(--border-card)',
                borderRadius: '9999px',
                padding: '2px 8px',
              }}>
                {filteredAndSorted.length}개
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="이름, 전화번호, 키 검색"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    paddingTop: '7px',
                    paddingBottom: '7px',
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-input)',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    color: 'var(--text-near-black)',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    width: '220px',
                  }}
                />
              </div>

              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                style={{
                  padding: '7px 12px',
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-input)',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  color: 'var(--text-near-black)',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="created_desc">최신 등록순</option>
                <option value="remaining_asc">잔여일 ↑ (낮은순)</option>
                <option value="remaining_desc">잔여일 ↓ (높은순)</option>
                <option value="name_asc">이름순</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '16px' }}>
              <div style={{ width: '32px', height: '32px', border: '2.5px solid var(--border-card)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>불러오는 중...</p>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div style={{ padding: '80px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 라이선스가 없습니다.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => { setNewKey(genKey()); setShowCreate(true) }}
                  style={{ marginTop: '16px', background: '#000', color: '#fff', border: 'none', borderRadius: '9999px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  첫 라이선스 발급하기
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)' }}>
                    {['이름 / 전화번호', '라이선스 키', '만료일', '남은 기간', '상태', '액션'].map((th, i) => (
                      <th key={th} style={{
                        padding: '12px 20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-tertiary)',
                        textAlign: i === 5 ? 'right' : 'left',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        background: 'var(--bg-page)',
                      }}>
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map(lic => {
                    const remaining = getRemainingDays(lic.expires_at)
                    const isExpired = remaining < 0
                    const isUrgent = !isExpired && remaining <= 7
                    return (
                      <tr
                        key={lic.id}
                        style={{ borderBottom: '1px solid var(--border-card)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-page)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '16px 20px', minWidth: '140px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-near-black)' }}>
                            {lic.name ?? <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                          </div>
                          {lic.phone && (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              {lic.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'var(--text-near-black)',
                            background: 'var(--bg-page)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            letterSpacing: '0.5px',
                          }}>
                            {lic.license_key}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {formatDate(lic.expires_at)}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <RemainingDays remaining={remaining} isExpired={isExpired} isUrgent={isUrgent} />
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <StatusBadge isActive={lic.is_active} isExpired={isExpired} />
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <ActionButton variant="default" onClick={() => { setExtendTarget(lic); setExtendDays(90) }}>
                              연장
                            </ActionButton>
                            <ActionButton variant={lic.is_active ? 'warning' : 'success'} onClick={() => handleToggleActive(lic)}>
                              {lic.is_active ? '비활성화' : '활성화'}
                            </ActionButton>
                            <ActionButton variant="danger" onClick={() => handleDelete(lic)}>
                              삭제
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <Modal title="새 라이선스 발급" onClose={() => setShowCreate(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>이름</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="홍길동"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>전화번호</label>
                <input
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>라이선스 키</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.5px',
                  }}
                />
                <button
                  onClick={() => setNewKey(genKey())}
                  style={{
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-input)',
                    borderRadius: '9999px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  자동 생성
                </button>
              </div>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>사용 기간</label>
              <DaySelector value={newDays} onChange={setNewDays} />
              <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                만료일: {formatDate(addDays(newDays))}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '9999px',
                  background: 'var(--bg-page)', border: '1px solid var(--border-input)',
                  color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newKey}
                style={{
                  flex: 1, padding: '12px', borderRadius: '9999px',
                  background: '#000000', border: 'none', color: '#ffffff',
                  fontSize: '13px', fontWeight: 600,
                  cursor: creating || !newKey ? 'not-allowed' : 'pointer',
                  opacity: creating || !newKey ? 0.5 : 1,
                  fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s',
                }}
              >
                {creating ? '발급 중...' : '발급하기'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {extendTarget && (
        <Modal
          title="기간 연장"
          subtitle={extendTarget.license_key}
          onClose={() => setExtendTarget(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>추가할 기간</label>
              <DaySelector value={extendDays} onChange={setExtendDays} prefix="+" />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setExtendTarget(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '9999px',
                  background: 'var(--bg-page)', border: '1px solid var(--border-input)',
                  color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                취소
              </button>
              <button
                onClick={handleExtend}
                style={{
                  flex: 1, padding: '12px', borderRadius: '9999px',
                  background: '#000000', border: 'none', color: '#ffffff',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                연장하기
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
