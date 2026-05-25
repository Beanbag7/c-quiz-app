import { config } from '../config.js'
import { getRedisClient } from '../redis/client.js'

const SCOPES = ['home', 'quiz']

const presenceKey = (scope) => `presence:${scope}`

export async function updatePresence({ visitorId, scope, now = new Date() }) {
  const redis = await getRedisClient()
  const timestamp = now.getTime()

  await cleanupPresence(redis, timestamp)
  await redis.zAdd(presenceKey(scope), [{ score: timestamp, value: visitorId }])
  await redis.expire(presenceKey(scope), config.presenceTtlSeconds * 2)

  return getPresenceCounts({ redis, now })
}

export async function getPresenceCounts({ redis, now = new Date() } = {}) {
  const activeRedis = redis || (await getRedisClient())
  const timestamp = now.getTime()

  await cleanupPresence(activeRedis, timestamp)

  const scopeMembers = await Promise.all(
    SCOPES.map(async (scope) => [scope, await activeRedis.zRange(presenceKey(scope), 0, -1)]),
  )

  const online = {}
  const totalVisitors = new Set()

  for (const [scope, members] of scopeMembers) {
    online[scope] = members.length
    members.forEach((visitorId) => totalVisitors.add(visitorId))
  }

  online.total = totalVisitors.size

  return {
    online,
    observedAt: now.toISOString(),
  }
}

async function cleanupPresence(redis, timestamp) {
  const expiredBefore = timestamp - config.presenceTtlSeconds * 1000
  await Promise.all(SCOPES.map((scope) => redis.zRemRangeByScore(presenceKey(scope), 0, expiredBefore)))
}
