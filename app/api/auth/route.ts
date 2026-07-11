import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { signToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

// 무차별 대입(brute-force) 방어 — Supabase(login_throttle)에 지속 저장해
// 서버리스 인스턴스 간 카운터를 공유한다(인메모리 Map 은 인스턴스마다 초기화돼 무의미했음).
const WINDOW_MS = 15 * 60 * 1000 // 15분
const MAX_FAILS = 5              // IP당 허용 실패 수
const GLOBAL_MAX = 20            // 전체 합산(분산 공격 방어) 허용 실패 수

// Vercel 이 세팅하는 x-real-ip 를 우선 사용(클라이언트가 위조 불가).
// x-forwarded-for 맨 왼쪽 값은 클라이언트가 조작할 수 있으므로 신뢰하지 않는다.
function clientIp(req: NextRequest): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1] // 신뢰 프록시가 덧붙인 맨 오른쪽
  }
  return 'unknown'
}

// 상수시간 문자열 비교(타이밍 사이드채널 완화)
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// ip / global 카운터를 한 번의 쿼리로 확인
async function isBlocked(ipKey: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('login_throttle')
      .select('key, fails, window_start')
      .in('key', [ipKey, 'global'])
    if (!data) return false
    const now = Date.now()
    for (const row of data) {
      const active = now - new Date(row.window_start).getTime() < WINDOW_MS
      if (!active) continue
      if (row.key === 'global' && row.fails >= GLOBAL_MAX) return true
      if (row.key === ipKey && row.fails >= MAX_FAILS) return true
    }
    return false
  } catch {
    return false // fail-open: 스토어 오류 시 잠그지 않음(비밀번호는 여전히 검증됨)
  }
}

async function recordFailure(key: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from('login_throttle')
      .select('fails, window_start')
      .eq('key', key)
      .maybeSingle()
    const active = data && Date.now() - new Date(data.window_start).getTime() < WINDOW_MS
    if (active) {
      await supabaseAdmin.from('login_throttle').update({ fails: data!.fails + 1 }).eq('key', key)
    } else {
      await supabaseAdmin
        .from('login_throttle')
        .upsert({ key, fails: 1, window_start: new Date().toISOString() }, { onConflict: 'key' })
    }
  } catch {
    /* ignore — 방어 카운터 기록 실패가 로그인을 막지 않도록 */
  }
}

async function resetFailures(keys: string[]): Promise<void> {
  try {
    await supabaseAdmin.from('login_throttle').delete().in('key', keys)
  } catch {
    /* ignore */
  }
}

export async function POST(req: NextRequest) {
  const ipKey = `ip:${clientIp(req)}`

  if (await isBlocked(ipKey)) {
    return NextResponse.json(
      { error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
      { status: 429 }
    )
  }

  const { id, password } = await req.json()
  const idOk = safeEqual(id ?? '', process.env.ADMIN_ID ?? '')
  const pwOk = safeEqual(password ?? '', process.env.ADMIN_PASSWORD ?? '')
  if (!idOk || !pwOk) {
    await recordFailure(ipKey)
    await recordFailure('global')
    return NextResponse.json({ error: '아이디 또는 비밀번호가 틀렸습니다.' }, { status: 401 })
  }

  await resetFailures([ipKey, 'global'])

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
