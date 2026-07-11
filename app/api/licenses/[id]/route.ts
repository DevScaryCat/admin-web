import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  // 컬럼 화이트리스트 — id/license_key/created_at 등 임의 컬럼 덮어쓰기(mass-assignment) 차단.
  const licUpdate: Record<string, unknown> = {}
  if ('expires_at' in body) licUpdate.expires_at = body.expires_at
  if ('is_active' in body) licUpdate.is_active = body.is_active

  if (Object.keys(licUpdate).length > 0) {
    const { error } = await supabaseAdmin.from('licenses').update(licUpdate).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // PII(name/phone)는 별도 테이블에 upsert
  if ('name' in body || 'phone' in body) {
    const { error } = await supabaseAdmin
      .from('license_holders')
      .upsert(
        { license_id: id, name: body.name ?? null, phone: body.phone ?? null },
        { onConflict: 'license_id' }
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // license_holders 는 FK on delete cascade 로 자동 삭제됨
  const { error } = await supabaseAdmin.from('licenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
