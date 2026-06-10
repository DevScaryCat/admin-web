import { NextResponse, NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Next.js 16: middleware → proxy 로 이름이 바뀜. 인증 게이트는 여기서 처리.
// /dashboard 이하는 유효한 admin_token 쿠키가 없으면 로그인(/)으로 돌려보낸다.
// (이전엔 게이트가 없어 대시보드 UI가 무인증으로 열렸음 — 데이터는 API에서 막혔지만 껍데기는 노출)
const secret = new TextEncoder().encode(process.env.JWT_SECRET || '')

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  let ok = false
  if (token) {
    try {
      await jwtVerify(token, secret)
      ok = true
    } catch {
      ok = false
    }
  }
  if (!ok) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
