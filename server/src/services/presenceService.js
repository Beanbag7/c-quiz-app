import { config } from '../config.js'
import { withStorageOperation } from '../storage/index.js'

const SCOPES = ['home', 'quiz']

const presenceKey = (scope) => `presence:${scope}`

export async function updatePresence({ visitorId, scope, now = new Date() }) {
  const timestamp = now.getTime()

  return withStorageOperation(async (storage) => {
    await cleanupPresence(storage, timestamp)
    await storage.zAdd(presenceKey(scope), [{ score: timestamp, value: visitorId }])
    await storage.expire(presenceKey(scope), config.presenceTtlSeconds * 2)
    return getPresenceCounts({ redis: storage, now })
  })
}

export async function getPresenceCounts({ redis, now = new Date() } = {}) {
  if (!redis) {
    return withStorageOperation((storage) => getPresenceCounts({ redis: storage, now }))
  }

  const activeRedis = redis
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
