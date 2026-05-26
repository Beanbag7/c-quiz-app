import crypto from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { config } from '../config.js'
import { withStorageOperation } from '../storage/index.js'

const sessionKey = (sessionId) => `admin-session:${sessionId}`
const secret = new TextEncoder().encode(config.sessionSecret || '')

export function verifyAdminPassword(password) {
  if (typeof password !== 'string' || !config.adminPassword) return false

  const actual = Buffer.from(password)
  const expected = Buffer.from(config.adminPassword)

  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(actual, expected)
}

export async function createAdminSession({ now = new Date() } = {}) {
  const sessionId = crypto.randomUUID()
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + config.adminSessionTtlSeconds * 1000)

  await withStorageOperation(async (storage) => {
    await storage.hSet(sessionKey(sessionId), {
      sessionId,
      isAdmin: 'true',
      createdAt,
    })
    await storage.expire(sessionKey(sessionId), config.adminSessionTtlSeconds)
  })

  const token = await new SignJWT({ sid: sessionId, isAdmin: true, createdAt })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(secret)

  return {
    sessionId,
    token,
    isAdmin: true,
    createdAt,
  }
}

export async function getAdminSession(token) {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secret)
    const sessionId = payload.sid
    if (!sessionId) return null

    const session = await withStorageOperation((storage) => storage.hGetAll(sessionKey(sessionId)))
    if (session.isAdmin !== 'true') return null

    await withStorageOperation((storage) => storage.expire(sessionKey(sessionId), config.adminSessionTtlSeconds))

    return {
      sessionId: session.sessionId,
      isAdmin: true,
      createdAt: session.createdAt,
    }
  } catch {
    return null
  }
}

export async function deleteAdminSession(token) {
  if (!token) return

  const session = await getAdminSession(token)
  if (!session) return

  await withStorageOperation((storage) => storage.del(sessionKey(session.sessionId)))
}
