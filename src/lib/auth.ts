import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { getUserById } from './queries'
import type { UserPublic } from './types'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'monah-local-dev-secret-change-me',
)

export const SESSION_COOKIE = 'monah_session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<UserPublic | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const uid = payload.uid
    if (typeof uid !== 'string') return null
    const user = getUserById(uid)
    if (!user || user.isBanned) return null
    return user
  } catch {
    return null
  }
}
