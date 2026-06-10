'use client'

import { useEffect, useState } from 'react'

// 공개 다운로드 페이지 — 깃허브 최신 릴리스(public repo)를 자동 연동.
// 버전을 새로 올려도 이 페이지는 항상 최신 파일을 가리킨다(수정 불필요).
const RELEASES_API = 'https://api.github.com/repos/DevScaryCat/autobrand-releases/releases/latest'

type Assets = {
  version: string
  win?: string
  macArm?: string
  macIntel?: string
}

type OS = 'windows' | 'mac' | 'other'

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/Windows|Win32|Win64/i.test(ua)) return 'windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac'
  return 'other'
}

export default function DownloadPage() {
  const [assets, setAssets] = useState<Assets | null>(null)
  const [error, setError] = useState(false)
  const [os, setOS] = useState<OS>('other')

  useEffect(() => {
    setOS(detectOS())
    fetch(RELEASES_API)
      .then((r) => r.json())
      .then((data) => {
        const list: { name: string; browser_download_url: string }[] = data.assets || []
        const find = (pred: (n: string) => boolean) =>
          list.find((a) => pred(a.name.toLowerCase()))?.browser_download_url
        setAssets({
          version: (data.tag_name || '').replace(/^v/, ''),
          win: find((n) => n.endsWith('.exe')),
          macArm: find((n) => n.includes('arm64') && n.endsWith('.dmg')),
          macIntel: find((n) => n.endsWith('.dmg') && !n.includes('arm64')),
        })
      })
      .catch(() => setError(true))
  }, [])

  const wrap: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(1200px 600px at 50% -10%, #14301f 0%, #0a0a0a 55%)',
    color: '#fff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif',
    padding: '24px',
  }
  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: 460,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '40px 32px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  }
  const primaryBtn: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '16px',
    borderRadius: 14,
    background: 'linear-gradient(135deg, #03C75A, #1ED760)',
    color: '#06281a',
    fontWeight: 700,
    fontSize: 17,
    textDecoration: 'none',
    marginBottom: 12,
  }
  const subBtn: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '12px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    color: '#cfd3d8',
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    marginBottom: 10,
    border: '1px solid rgba(255,255,255,0.08)',
  }

  const winBtn = (style: React.CSSProperties, label: string) =>
    assets?.win ? (
      <a href={assets.win} style={style}>
        {label}
      </a>
    ) : null
  const macArmBtn = (style: React.CSSProperties, label: string) =>
    assets?.macArm ? (
      <a href={assets.macArm} style={style}>
        {label}
      </a>
    ) : null
  const macIntelBtn = (style: React.CSSProperties, label: string) =>
    assets?.macIntel ? (
      <a href={assets.macIntel} style={style}>
        {label}
      </a>
    ) : null

  return (
    <main style={wrap}>
      <div style={card}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            margin: '0 auto 18px',
            background: 'linear-gradient(135deg, #03C75A, #1ED760)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            fontWeight: 800,
            color: '#06281a',
          }}
        >
          A
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>AutoBrand Connect</h1>
        <p style={{ color: '#9aa0a6', fontSize: 14, margin: '0 0 4px' }}>
          네이버 브랜드커넥트 자동화 프로그램
        </p>
        {assets?.version && (
          <p style={{ color: '#03C75A', fontSize: 13, fontWeight: 600, margin: '0 0 28px' }}>
            최신 버전 v{assets.version}
          </p>
        )}
        {!assets?.version && <div style={{ height: 28 }} />}

        {error && (
          <p style={{ color: '#f87171', fontSize: 14 }}>
            다운로드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        )}

        {!error && !assets && <p style={{ color: '#9aa0a6', fontSize: 14 }}>불러오는 중...</p>}

        {assets && (
          <>
            {/* OS 자동 감지 → 우선 버튼 */}
            {os === 'windows' && (
              <>
                {winBtn(primaryBtn, '⬇  Windows 다운로드')}
                {macArmBtn(subBtn, 'Mac (애플 실리콘 M1·M2·M3)')}
                {macIntelBtn(subBtn, 'Mac (인텔)')}
              </>
            )}
            {os === 'mac' && (
              <>
                {macArmBtn(primaryBtn, '⬇  Mac 다운로드 (애플 실리콘)')}
                {macIntelBtn(subBtn, 'Mac (인텔 칩)')}
                {winBtn(subBtn, 'Windows')}
              </>
            )}
            {os === 'other' && (
              <>
                {winBtn(primaryBtn, '⬇  Windows 다운로드')}
                {macArmBtn(subBtn, 'Mac (애플 실리콘 M1·M2·M3)')}
                {macIntelBtn(subBtn, 'Mac (인텔 칩)')}
              </>
            )}
          </>
        )}

        <p style={{ color: '#6b7178', fontSize: 12, marginTop: 22, lineHeight: 1.6 }}>
          Windows는 설치 파일(.exe)을, Mac은 .dmg 파일을 받아 실행하세요.
          <br />
          설치 후에는 새 버전이 나오면 앱이 자동으로 업데이트됩니다.
        </p>
      </div>
    </main>
  )
}
