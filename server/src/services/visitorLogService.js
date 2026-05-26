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
    const allVisitorIds = await storage.zRange(visitorIndexKey, 0, -1, { REV: true })
    const visitorIds = allVisitorIds.slice(safeCursor, end + 1)

    const allRecords = await Promise.all(allVisitorIds.map((visitorId) => storage.hGetAll(visitorKey(visitorId))))
    const recordByVisitorId = new Map()
    const aggregatedByIp = new Map()

    for (const record of allRecords) {
      if (!record.visitorId) continue

      recordByVisitorId.set(record.visitorId, record)

      const ipAddress = record.ipAddress || record.maskedIp || 'unknown'
      const pageOpenCount = Number(record.heartbeatCount || 0)
      const currentIpStats = aggregatedByIp.get(ipAddress) || { totalPageOpenCount: 0, visitorCount: 0 }

      currentIpStats.totalPageOpenCount += pageOpenCount
      currentIpStats.visitorCount += 1
      aggregatedByIp.set(ipAddress, currentIpStats)
    }

    const items = visitorIds
      .map((visitorId) => recordByVisitorId.get(visitorId))
      .filter((record) => record?.visitorId)
      .map((record) => {
        const ipAddress = record.ipAddress || record.maskedIp || 'unknown'
        const pageOpenCount = Number(record.heartbeatCount || 0)
        const stats = aggregatedByIp.get(ipAddress)

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
          ipPageOpenCount: stats?.totalPageOpenCount || pageOpenCount,
          ipVisitorCount: stats?.visitorCount || 1,
        }
      })

    return {
      items,
      nextCursor: allVisitorIds.length > safeCursor + safeLimit ? safeCursor + safeLimit : null,
    }
  })
}
