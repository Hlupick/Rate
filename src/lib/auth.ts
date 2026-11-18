import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { getUserById } from './queries'
import type { UserPublic } from './types'

let cachedSecret: Uint8Array | null = null

/** Reads AUTH_SECRET lazily so a production build without it does not fail. */
function sessionSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const value = process.env.AUTH_SECRET
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET не задан: production-сессии без секрета небезопасны')
  }
  cachedSecret = new TextEncoder().encode(value ?? 'monah-local-dev-secret-change-me')
  return cachedSecret
}

export const SESSION_COOKIE = 'monah_session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function createSession(userId: string) {
  const version = getUserById(userId)?.sessionVersion ?? 0
  const token = await new SignJWT({ uid: userId, sv: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(sessionSecret())

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
  const secret = sessionSecret()
  try {
    const { payload } = await jwtVerify(token, secret)
    const uid = payload.uid
    if (typeof uid !== 'string') return null
    const user = getUserById(uid)
    if (!user || user.isBanned) return null
    if (Number(payload.sv ?? 0) !== user.sessionVersion) return null
    return user
  } catch {
    return null
  }
}
