import assert from 'node:assert/strict'
import test from 'node:test'
import { config } from '../config.js'
import { closeStorage } from '../storage/index.js'
import { listVisitorRecords, recordVisitorHeartbeat } from './visitorLogService.js'

test('listVisitorRecords aggregates page opens by IP across all visitor records', async () => {
  await closeStorage()

  const originalRedisUrl = config.redisUrl
  const originalGeoIpLookupUrl = config.geoIpLookupUrl

  config.redisUrl = undefined
  config.geoIpLookupUrl = ''

  try {
    const origin = { country: '中国', region: '广东', city: '深圳' }
    const firstSeenAt = new Date('2026-05-26T00:00:00.000Z')
    const secondSeenAt = new Date('2026-05-26T00:00:01.000Z')
    const thirdSeenAt = new Date('2026-05-26T00:00:02.000Z')

    await recordVisitorHeartbeat({
      visitorId: 'anon_11111111-1111-4111-8111-111111111111',
      ipAddress: '8.8.8.8',
      maskedIp: '8.8.*.*',
      origin,
      scope: 'home',
      now: firstSeenAt,
    })
    await recordVisitorHeartbeat({
      visitorId: 'anon_22222222-2222-4222-8222-222222222222',
      ipAddress: '8.8.8.8',
      maskedIp: '8.8.*.*',
      origin,
      scope: 'quiz',
      now: secondSeenAt,
    })
    await recordVisitorHeartbeat({
      visitorId: 'anon_22222222-2222-4222-8222-222222222222',
      ipAddress: '8.8.8.8',
      maskedIp: '8.8.*.*',
      origin,
      scope: 'quiz',
      now: thirdSeenAt,
    })

    const page = await listVisitorRecords({ cursor: 0, limit: 1 })

    assert.equal(page.items.length, 1)
    assert.equal(page.items[0].ipAddress, '8.8.8.8')
    assert.equal(page.items[0].ipPageOpenCount, 3)
    assert.equal(page.items[0].ipVisitorCount, 2)
    assert.equal(page.nextCursor, 1)
  } finally {
    config.redisUrl = originalRedisUrl
    config.geoIpLookupUrl = originalGeoIpLookupUrl
    await closeStorage()
  }
})

test('listVisitorRecords preserves historical provider values on read without mapping', async () => {
  await closeStorage()

  const originalRedisUrl = config.redisUrl
  config.redisUrl = undefined

  try {
    const { getStorage } = await import('../storage/index.js')
    const storage = await getStorage()

    await storage.hSet('visitor:anon_33333333-3333-4333-8333-333333333333', {
      visitorId: 'anon_33333333-3333-4333-8333-333333333333',
      ipAddress: '122.225.202.3',
      maskedIp: '122.225.*.*',
      country: 'China',
      region: 'Beijing',
      city: 'Beijing',
      lastScope: 'quiz',
      firstSeenAt: '2026-05-26T00:00:00.000Z',
      lastSeenAt: '2026-05-26T00:00:00.000Z',
      heartbeatCount: '2',
    })
    await storage.zAdd('visitor:index', [{ score: Date.parse('2026-05-26T00:00:00.000Z'), value: 'anon_33333333-3333-4333-8333-333333333333' }])

    const page = await listVisitorRecords({ cursor: 0, limit: 1 })

    assert.equal(page.items.length, 1)
    assert.equal(page.items[0].country, 'China')
    assert.equal(page.items[0].region, 'Beijing')
    assert.equal(page.items[0].city, 'Beijing')
    assert.equal(page.items[0].locationText, 'China / Beijing / Beijing')
  } finally {
    config.redisUrl = originalRedisUrl
    await closeStorage()
  }
})
