import crypto from 'node:crypto'
import { config } from '../config.js'
import { withStorageOperation } from '../storage/index.js'

const UNKNOWN_LOCATION = {
  country: '未知国家',
  region: '未知地区',
  city: '未知城市',
}

const REQUIRED_FIELDS = ['country', 'region', 'city']

const GEO_NAME_MAP = new Map([
  ['US', '美国'],
  ['UNITED STATES', '美国'],
  ['VIRGINIA', '弗吉尼亚州'],
  ['VIRGINIA, UNITED STATES', '弗吉尼亚州'],
  ['VA', '弗吉尼亚州'],
  ['ASHBURN', '阿什本'],
  ['CALIFORNIA', '加利福尼亚州'],
  ['CA', '加利福尼亚州'],
  ['MOUNTAIN VIEW', '山景城'],
  ['JAPAN', '日本'],
  ['TOKYO', '东京'],
  ['CHIYODA', '千代田'],
  ['CHINA', '中国'],
  ['CN', '中国'],
  ['GUANGDONG', '广东'],
  ['SHENZHEN', '深圳'],
])

export async function resolveGeoIpLocation(ipAddress, fallbackOrigin = UNKNOWN_LOCATION) {
  const fallbackLocation = normalizeLocation(fallbackOrigin)

  if (!isLookupCandidate(ipAddress)) return fallbackLocation

  try {
    return await withStorageOperation(async (storage) => {
      const cachedLocation = await readCachedLocation(storage, ipAddress)
      if (cachedLocation) return cachedLocation

      const lookupLocation = await lookupGeoIpLocation(ipAddress)
      if (!lookupLocation) return fallbackLocation

      await writeCachedLocation(storage, ipAddress, lookupLocation)
      return lookupLocation
    })
  } catch (error) {
    console.warn('[geo-ip] lookup failed; using request headers', error.message)
    return fallbackLocation
  }
}

export async function lookupGeoIpLocation(
  ipAddress,
  { fetchImpl = globalThis.fetch, providerUrl = config.geoIpLookupUrl, timeoutMs = config.geoIpLookupTimeoutMs } = {},
) {
  if (!fetchImpl || !providerUrl || !isLookupCandidate(ipAddress)) return undefined

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Default provider assumption: ipwho.is exposes an HTTPS Chinese REST endpoint with
    // country, region, and city fields. Override GEO_IP_LOOKUP_URL for a paid provider.
    const url = providerUrl.replace('{ip}', encodeURIComponent(ipAddress))
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) return undefined

    const payload = await response.json()
    return normalizeProviderPayload(payload)
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.warn('[geo-ip] provider request failed', error.message)
    }
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}

async function readCachedLocation(storage, ipAddress) {
  const cached = await storage.hGetAll(cacheKey(ipAddress))
  if (!cached || REQUIRED_FIELDS.some((field) => !cached[field])) return undefined
  return normalizeLocation(cached)
}

async function writeCachedLocation(storage, ipAddress, location) {
  const key = cacheKey(ipAddress)
  await storage.hSet(key, normalizeLocation(location))
  await storage.expire(key, config.geoIpCacheTtlSeconds)
}

function normalizeProviderPayload(payload) {
  if (!payload || payload.error || payload.status === 'fail' || payload.success === false) return undefined

  const location = normalizeLocation({
    country: payload.country_name || payload.country || payload.countryCode,
    region: payload.regionName || payload.region,
    city: payload.city,
  })

  if (REQUIRED_FIELDS.every((field) => location[field] === UNKNOWN_LOCATION[field])) return undefined
  return location
}

function normalizeLocation(location = UNKNOWN_LOCATION) {
  return {
    country: normalizeGeoValue(location.country, UNKNOWN_LOCATION.country),
    region: normalizeGeoValue(location.region, UNKNOWN_LOCATION.region),
    city: normalizeGeoValue(location.city, UNKNOWN_LOCATION.city),
  }
}

function normalizeGeoValue(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const trimmed = value.trim()
  return GEO_NAME_MAP.get(trimmed.toUpperCase()) || trimmed
}

function cacheKey(ipAddress) {
  return `geo-ip:${crypto.createHash('sha256').update(ipAddress).digest('hex')}`
}

function isLookupCandidate(ipAddress) {
  if (!ipAddress || typeof ipAddress !== 'string') return false

  const normalized = ipAddress.replace(/^::ffff:/, '').trim().toLowerCase()
  if (!normalized || normalized === 'unknown' || normalized === 'localhost' || normalized === '::1') return false
  if (/^(10|127)\./.test(normalized)) return false
  if (/^192\.168\./.test(normalized)) return false
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return false
  if (/^(fc|fd)/.test(normalized)) return false

  return true
}
