import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from './db'

type Row = Record<string, any>

export type PendingVerification = {
  id: string
  email: string
  username: string
  displayName: string
  passwordHash: string
  codeHash: string
  attempts: number
  createdAt: number
  expiresAt: number
}

export type PendingReset = {
  id: string
  userId: string
  email: string
  codeHash: string
  attempts: number
  createdAt: number
  expiresAt: number
}

function mapVerification(row: Row): PendingVerification {
  return {
    id: String(row.id),
    email: String(row.email),
    username: String(row.username),
    displayName: String(row.display_name),
    passwordHash: String(row.password_hash),
    codeHash: String(row.code_hash),
    attempts: Number(row.attempts ?? 0),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }
}

function mapReset(row: Row): PendingReset {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    email: String(row.email),
    codeHash: String(row.code_hash),
    attempts: Number(row.attempts ?? 0),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }
}

/* --------------------------- registration pending -------------------------- */

export function saveEmailVerification(input: {
  email: string
  username: string
  displayName: string
  passwordHash: string
  codeHash: string
  ip: string | null
  ttlMs: number
}): void {
  const now = Date.now()
  db.prepare('DELETE FROM email_verifications WHERE email = ?').run(input.email)
  db.prepare(
    `INSERT INTO email_verifications
       (id, email, username, display_name, password_hash, code_hash, attempts, ip, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(
    randomUUID(),
    input.email,
    input.username,
    input.displayName,
    input.passwordHash,
    input.codeHash,
    input.ip,
    now,
    now + input.ttlMs,
  )
}

export function getEmailVerification(email: string): PendingVerification | null {
  const row = db
    .prepare('SELECT * FROM email_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 1')
    .get(email) as Row | undefined
  return row ? mapVerification(row) : null
}

/** Replaces the code and restarts its lifetime, keeping the entered details. */
export function refreshVerificationCode(id: string, codeHash: string, ttlMs: number): void {
  const now = Date.now()
  db.prepare(
    'UPDATE email_verifications SET code_hash = ?, attempts = 0, created_at = ?, expires_at = ? WHERE id = ?',
  ).run(codeHash, now, now + ttlMs, id)
}

export function bumpVerificationAttempts(id: string): number {
  db.prepare('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?').run(id)
  const row = db.prepare('SELECT attempts FROM email_verifications WHERE id = ?').get(id) as
    | Row
    | undefined
  return Number(row?.attempts ?? 0)
}

export function deleteEmailVerification(id: string): void {
  db.prepare('DELETE FROM email_verifications WHERE id = ?').run(id)
}

/* ------------------------------ password reset ----------------------------- */

export function savePasswordReset(input: {
  userId: string
  email: string
  codeHash: string
  ip: string | null
  ttlMs: number
}): void {
  const now = Date.now()
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(input.userId)
  db.prepare(
    `INSERT INTO password_resets
       (id, user_id, email, code_hash, attempts, ip, created_at, expires_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(randomUUID(), input.userId, input.email, input.codeHash, input.ip, now, now + input.ttlMs)
}

export function getPasswordReset(email: string): PendingReset | null {
  const row = db
    .prepare('SELECT * FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1')
    .get(email) as Row | undefined
  return row ? mapReset(row) : null
}

export function bumpResetAttempts(id: string): number {
  db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?').run(id)
  const row = db.prepare('SELECT attempts FROM password_resets WHERE id = ?').get(id) as
    | Row
    | undefined
  return Number(row?.attempts ?? 0)
}

export function deletePasswordReset(id: string): void {
  db.prepare('DELETE FROM password_resets WHERE id = ?').run(id)
}
