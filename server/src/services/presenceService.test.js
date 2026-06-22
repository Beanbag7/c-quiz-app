import assert from 'node:assert/strict'
import test from 'node:test'
import { config } from '../config.js'
import { closeStorage } from '../storage/index.js'
import { getPresenceCounts, updatePresence } from './presenceService.js'
import { recordVisitorHeartbeat } from './visitorLogService.js'

test('getPresenceCounts returns masked IP and location for online users', async () => {
  await closeStorage()

  const originalRedisUrl = config.redisUrl
  const originalGeoIpLookupUrl = config.geoIpLookupUrl
  const originalPresenceTtlSeconds = config.presenceTtlSeconds

  config.redisUrl = undefined
  config.geoIpLookupUrl = ''
  config.presenceTtlSeconds = 60

  try {
    const now = new Date('2026-06-22T08:00:00.000Z')
    const visitorId = 'anon_44444444-4444-4444-8444-444444444444'

    await recordVisitorHeartbeat({
      visitorId,
      ipAddress: '122.225.202.3',
      maskedIp: '122.225.*.*',
      origin: { country: '中国', region: '浙江', city: '杭州' },
      scope: 'home',
      now,
    })
    await updatePresence({ visitorId, scope: 'home', now })

    const snapshot = await getPresenceCounts({ now })

    assert.equal(snapshot.online.total, 1)
    assert.equal(snapshot.users.length, 1)
    assert.equal(snapshot.users[0].visitorId, visitorId)
    assert.equal(snapshot.users[0].maskedIp, '122.225.*.*')
    assert.equal(snapshot.users[0].locationText, '中国 / 浙江 / 杭州')
    assert.deepEqual(snapshot.users[0].scopes, ['home'])
  } finally {
    config.redisUrl = originalRedisUrl
    config.geoIpLookupUrl = originalGeoIpLookupUrl
    config.presenceTtlSeconds = originalPresenceTtlSeconds
    await closeStorage()
  }
})
