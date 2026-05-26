import assert from 'node:assert/strict'
import test from 'node:test'
import { config } from '../config.js'
import { closeStorage } from '../storage/index.js'
import { lookupGeoIpLocation, resolveGeoIpLocation } from './geoIpService.js'

test('lookupGeoIpLocation maps provider payload to visitor location fields', async () => {
  const location = await lookupGeoIpLocation('8.8.8.8', {
    providerUrl: 'https://example.test/{ip}',
    fetchImpl: async (url) => {
      assert.equal(url, 'https://example.test/8.8.8.8')
      return {
        ok: true,
        async json() {
          return { country_name: 'United States', region: 'California', city: 'Mountain View' }
        },
      }
    },
  })

  assert.deepEqual(location, {
    country: 'United States',
    region: 'California',
    city: 'Mountain View',
  })
})

test('lookupGeoIpLocation maps ip-api Chinese payload to visitor location fields', async () => {
  const location = await lookupGeoIpLocation('8.8.8.8', {
    providerUrl: 'http://ip-api.test/json/{ip}?lang=zh-CN',
    fetchImpl: async (url) => {
      assert.equal(url, 'http://ip-api.test/json/8.8.8.8?lang=zh-CN')
      return {
        ok: true,
        async json() {
          return { status: 'success', country: '美国', region: 'CA', regionName: '加利福尼亚州', city: '山景城' }
        },
      }
    },
  })

  assert.deepEqual(location, {
    country: '美国',
    region: '加利福尼亚州',
    city: '山景城',
  })
})

test('lookupGeoIpLocation preserves provider values without local mapping', async () => {
  const location = await lookupGeoIpLocation('8.8.8.8', {
    providerUrl: 'https://example.test/{ip}',
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { country_name: 'United States', region: 'VA', city: 'Ashburn' }
      },
    }),
  })

  assert.deepEqual(location, {
    country: 'United States',
    region: 'VA',
    city: 'Ashburn',
  })
})

test('lookupGeoIpLocation returns undefined for provider failures', async () => {
  const location = await lookupGeoIpLocation('8.8.4.4', {
    providerUrl: 'https://example.test/{ip}',
    fetchImpl: async () => ({ ok: false }),
  })

  assert.equal(location, undefined)
})

test('resolveGeoIpLocation caches successful lookups and falls back to headers', async () => {
  await closeStorage()

  const originalLookupUrl = config.geoIpLookupUrl
  const originalRedisUrl = config.redisUrl
  const originalFetch = globalThis.fetch
  let fetchCount = 0

  config.redisUrl = undefined
  config.geoIpLookupUrl = 'https://example.test/{ip}'
  globalThis.fetch = async () => {
    fetchCount += 1
    return {
      ok: true,
      async json() {
        return { country: '日本', regionName: '东京', city: '千代田', status: 'success' }
      },
    }
  }

  try {
    const fallback = { country: '中国', region: '广东', city: '深圳' }
    const firstLocation = await resolveGeoIpLocation('8.8.8.8', fallback)
    const secondLocation = await resolveGeoIpLocation('8.8.8.8', fallback)
    const privateLocation = await resolveGeoIpLocation('192.168.0.1', fallback)

    assert.deepEqual(firstLocation, { country: '日本', region: '东京', city: '千代田' })
    assert.deepEqual(secondLocation, firstLocation)
    assert.deepEqual(privateLocation, fallback)
    assert.equal(fetchCount, 1)
  } finally {
    config.geoIpLookupUrl = originalLookupUrl
    config.redisUrl = originalRedisUrl
    globalThis.fetch = originalFetch
    await closeStorage()
  }
})
