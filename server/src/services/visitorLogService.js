import { getRedisClient } from '../redis/client.js'

const visitorKey = (visitorId) => `visitor:${visitorId}`
const visitorIndexKey = 'visitor:index'

export async function recordVisitorHeartbeat({ visitorId, maskedIp, origin, scope, now = new Date() }) {
  const redis = await getRedisClient()
  const key = visitorKey(visitorId)
  const nowIso = now.toISOString()
  const exists = await redis.exists(key)

  const updates = {
    visitorId,
    maskedIp,
    country: origin.country,
    region: origin.region,
    city: origin.city,
    lastScope: scope,
    lastSeenAt: nowIso,
  }

  if (!exists) {
    updates.firstSeenAt = nowIso
  }

  await redis.hSet(key, updates)
  await redis.hIncrBy(key, 'heartbeatCount', 1)
  await redis.zAdd(visitorIndexKey, [{ score: now.getTime(), value: visitorId }])
}

export async function listVisitorRecords({ cursor = 0, limit = 50 } = {}) {
  const redis = await getRedisClient()
  const safeCursor = Math.max(0, Number(cursor) || 0)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50))
  const end = safeCursor + safeLimit - 1
  const visitorIds = await redis.zRange(visitorIndexKey, safeCursor, end, { REV: true })

  const records = await Promise.all(visitorIds.map((visitorId) => redis.hGetAll(visitorKey(visitorId))))
  const items = records
    .filter((record) => record.visitorId)
    .map((record) => ({
      visitorId: record.visitorId,
      maskedIp: record.maskedIp || 'unknown',
      country: record.country || 'Unknown',
      region: record.region || 'Unknown',
      city: record.city || 'Unknown',
      lastScope: record.lastScope || 'home',
      firstSeenAt: record.firstSeenAt,
      lastSeenAt: record.lastSeenAt,
      heartbeatCount: Number(record.heartbeatCount || 0),
    }))

  return {
    items,
    nextCursor: visitorIds.length === safeLimit ? safeCursor + safeLimit : null,
  }
}
