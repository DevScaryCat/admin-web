import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// 무차별 대입(brute-force) 완화용 경량 IP 레이트리밋.
// ⚠️ 서버리스라 인스턴스마다 메모리가 따로 → 완벽한 분산 차단은 아님(1차 방어는 강한 비밀번호).
// 그래도 단일 공격자의 자동 연타를 크게 늦춘다. 실패만 카운트하고 성공 시 초기화.
const failures = new Map<string, { count: number; first: number }>()
const WINDOW_MS = 15 * 60 * 1000 // 15분
const MAX_FAILS = 5

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const rec = failures.get(ip)
  const windowActive = !!rec && now - rec.first < WINDOW_MS

  // 한도 초과면 즉시 차단
  if (windowActive && rec!.count >= MAX_FAILS) {
    return NextResponse.json(
      { error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
      { status: 429 }
    )
  }

  const { id, password } = await req.json()
  const idOk = id === process.env.ADMIN_ID
  const pwOk = password === process.env.ADMIN_PASSWORD
  if (!idOk || !pwOk) {
    // 실패 기록 (윈도우 만료됐으면 새로 시작)
    if (!windowActive) failures.set(ip, { count: 1, first: now })
    else rec!.count++
    return NextResponse.json({ error: '아이디 또는 비밀번호가 틀렸습니다.' }, { status: 401 })
  }

  // 성공 → 해당 IP 실패 기록 초기화
  failures.delete(ip)

  const token = await signToken()
  const cookieStore = await cookies()
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_token')
  return NextResponse.json({ ok: true })
}
