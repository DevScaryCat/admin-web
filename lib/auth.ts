import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signToken() {
  return await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export async function isAuthenticated() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return false
  return verifyToken(token)
}
