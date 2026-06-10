'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [id, setId] = useState('')
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
      body: JSON.stringify({ id, password }),
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
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#000000',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-whisper)',
          }}>
            <span style={{
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '22px',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '-1px',
            }}>A</span>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-1.6px',
            lineHeight: 1.1,
            marginBottom: '8px',
          }}>
            AutoBrand
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            fontWeight: 400,
          }}>
            라이선스 관리 시스템
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: 'var(--shadow-whisper)',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-near-black)',
            marginBottom: '24px',
            letterSpacing: '-0.3px',
          }}>
            관리자 로그인
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-mid)',
                marginBottom: '8px',
              }}>
                아이디
              </label>
              <input
                type="text"
                value={id}
                onChange={e => setId(e.target.value)}
                placeholder="관리자 아이디"
                required
                autoComplete="username"
                style={{
                  width: '100%',
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-input)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: 'var(--text-near-black)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#000'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-input)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-mid)',
                marginBottom: '8px',
              }}>
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="관리자 비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-input)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: 'var(--text-near-black)',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#000'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-input)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {error && (
              <p style={{
                fontSize: '13px',
                color: '#c0392b',
                background: '#fdf2f2',
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                padding: '10px 14px',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.15s, transform 0.1s',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.2px',
              }}
              onMouseEnter={e => {
                if (!loading) (e.target as HTMLButtonElement).style.opacity = '0.8'
              }}
              onMouseLeave={e => {
                if (!loading) (e.target as HTMLButtonElement).style.opacity = '1'
              }}
            >
              {loading ? '확인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
        }}>
          AutoBrand Connect © 2026
        </p>
      </div>
    </div>
  )
}
