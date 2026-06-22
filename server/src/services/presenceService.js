import { config } from '../config.js'
import { withStorageOperation } from '../storage/index.js'
import { maskIp } from '../utils/visitor.js'

const SCOPES = ['home', 'quiz']

const presenceKey = (scope) => `presence:${scope}`
const visitorKey = (visitorId) => `visitor:${visitorId}`

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
  const totalVisitors = new Map()

  for (const [scope, members] of scopeMembers) {
    online[scope] = members.length
    members.forEach((visitorId) => {
      const current = totalVisitors.get(visitorId) || { visitorId, scopes: [] }
      current.scopes.push(scope)
      totalVisitors.set(visitorId, current)
    })
  }

  online.total = totalVisitors.size

  const users = await Promise.all(
    [...totalVisitors.values()].map(async (presence) => {
      const record = await activeRedis.hGetAll(visitorKey(presence.visitorId))
      const ipAddress = record.ipAddress || record.maskedIp || ''
      const locationText = formatLocationText(record)

      return {
        visitorId: presence.visitorId,
        maskedIp: maskIp(ipAddress),
        locationText,
        scopes: presence.scopes,
        lastScope: record.lastScope || presence.scopes.at(-1) || 'home',
        lastSeenAt: record.lastSeenAt || null,
      }
    }),
  )

  return {
    online,
    users: users.sort(comparePresenceUsers),
    observedAt: now.toISOString(),
  }
}

function formatLocationText(record) {
  const parts = [record.country, record.region, record.city]
    .map((part) => String(part || '').trim())
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : '未知地区'
}

function comparePresenceUsers(left, right) {
  const leftSeen = Date.parse(left.lastSeenAt || '') || 0
  const rightSeen = Date.parse(right.lastSeenAt || '') || 0
  return rightSeen - leftSeen
}

async function cleanupPresence(redis, timestamp) {
  const expiredBefore = timestamp - config.presenceTtlSeconds * 1000
  await Promise.all(SCOPES.map((scope) => redis.zRemRangeByScore(presenceKey(scope), 0, expiredBefore)))
}
