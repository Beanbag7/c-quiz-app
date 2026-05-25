import crypto from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { config } from '../config.js'
import { getRedisClient } from '../redis/client.js'

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
  const redis = await getRedisClient()
  const sessionId = crypto.randomUUID()
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + config.adminSessionTtlSeconds * 1000)

  await redis.hSet(sessionKey(sessionId), {
    sessionId,
    isAdmin: 'true',
    createdAt,
  })
  await redis.expire(sessionKey(sessionId), config.adminSessionTtlSeconds)

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

    const redis = await getRedisClient()
    const session = await redis.hGetAll(sessionKey(sessionId))
    if (session.isAdmin !== 'true') return null

    await redis.expire(sessionKey(sessionId), config.adminSessionTtlSeconds)

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

  const redis = await getRedisClient()
  await redis.del(sessionKey(session.sessionId))
}
