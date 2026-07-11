import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// PII(name/phone)는 anon 이 읽을 수 없는 별도 테이블 license_holders 에 보관한다.
// 관리자 API(service_role)만 조인으로 읽고 쓴다.
type HolderRow = { name: string | null; phone: string | null }

function flattenHolder(row: Record<string, unknown>) {
  const raw = row.license_holders as HolderRow | HolderRow[] | null | undefined
  const holder = Array.isArray(raw) ? raw[0] : raw
  const { license_holders: _omit, ...rest } = row
  return { ...rest, name: holder?.name ?? null, phone: holder?.phone ?? null }
}

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('licenses')
    .select('*, license_holders(name, phone)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(flattenHolder))
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { license_key, expires_at, name, phone } = await req.json()
  if (!license_key || !expires_at) {
    return NextResponse.json({ error: '키와 만료일은 필수입니다.' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('licenses')
    .insert({ license_key, expires_at, is_active: true })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (name || phone) {
    const { error: hErr } = await supabaseAdmin
      .from('license_holders')
      .insert({ license_id: data.id, name: name || null, phone: phone || null })
    if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 })
  }
  return NextResponse.json({ ...data, name: name || null, phone: phone || null })
}
