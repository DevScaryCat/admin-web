import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Supabase 무료 플랜은 7일 무활동 시 프로젝트를 자동 정지시킨다.
// 이 엔드포인트를 Vercel Cron이 매일 1회 호출 → DB에 가벼운 요청을 발생시켜
// "활동 중" 상태를 유지 → 자동 정지를 막는다. (vercel.json 의 crons 참고)
export const dynamic = 'force-dynamic'

export async function GET() {
  const { error } = await supabaseAdmin
    .from('licenses')
    .select('id', { count: 'exact', head: true })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ping: 'alive' })
}
