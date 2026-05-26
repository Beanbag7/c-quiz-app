import { withStorageOperation } from '../storage/index.js'
import { resolveGeoIpLocation } from './geoIpService.js'

const visitorKey = (visitorId) => `visitor:${visitorId}`
const visitorIndexKey = 'visitor:index'

export async function recordVisitorHeartbeat({ visitorId, ipAddress, maskedIp, origin, scope, now = new Date() }) {
  const location = await resolveGeoIpLocation(ipAddress, origin)

  return withStorageOperation(async (storage) => {
    const key = visitorKey(visitorId)
    const nowIso = now.toISOString()
    const visibleIpAddress = ipAddress || maskedIp || 'unknown'
    const exists = await storage.exists(key)

    const updates = {
      visitorId,
      maskedIp,
      ipAddress: visibleIpAddress,
      country: location.country,
      region: location.region,
      city: location.city,
      lastScope: scope,
      lastSeenAt: nowIso,
    }

    if (!exists) {
      updates.firstSeenAt = nowIso
    }

    await storage.hSet(key, updates)
    await storage.hIncrBy(key, 'heartbeatCount', 1)
    await storage.zAdd(visitorIndexKey, [{ score: now.getTime(), value: visitorId }])
  })
}

export async function listVisitorRecords({ cursor = 0, limit = 50 } = {}) {
  return withStorageOperation(async (storage) => {
    const safeCursor = Math.max(0, Number(cursor) || 0)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50))
    const end = safeCursor + safeLimit - 1
    const visitorIds = await storage.zRange(visitorIndexKey, safeCursor, end, { REV: true })

    const records = await Promise.all(visitorIds.map((visitorId) => storage.hGetAll(visitorKey(visitorId))))
    const aggregatedByIp = new Map()

    const items = records
      .filter((record) => record.visitorId)
      .map((record) => {
        const ipAddress = record.ipAddress || record.maskedIp || 'unknown'
        const pageOpenCount = Number(record.heartbeatCount || 0)
        const currentIpStats = aggregatedByIp.get(ipAddress) || { totalPageOpenCount: 0, visitorCount: 0 }

        currentIpStats.totalPageOpenCount += pageOpenCount
        currentIpStats.visitorCount += 1
        aggregatedByIp.set(ipAddress, currentIpStats)

        return {
          visitorId: record.visitorId,
          ipAddress,
          country: record.country || '未知国家',
          region: record.region || '未知地区',
          city: record.city || '未知城市',
          locationText: [record.country || '未知国家', record.region || '未知地区', record.city || '未知城市'].join(' / '),
          lastScope: record.lastScope || 'home',
          firstSeenAt: record.firstSeenAt,
          lastSeenAt: record.lastSeenAt,
          heartbeatCount: pageOpenCount,
          ipPageOpenCount: 0,
          ipVisitorCount: 0,
        }
      })

    for (const item of items) {
      const stats = aggregatedByIp.get(item.ipAddress)
      item.ipPageOpenCount = stats?.totalPageOpenCount || item.heartbeatCount
      item.ipVisitorCount = stats?.visitorCount || 1
    }

    return {
      items,
      nextCursor: visitorIds.length === safeLimit ? safeCursor + safeLimit : null,
    }
  })
}
