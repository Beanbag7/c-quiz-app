import dotenv from 'dotenv'

dotenv.config()

const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  port: toNumber(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL,
  adminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET,
  presenceTtlSeconds: toNumber(process.env.PRESENCE_TTL_SECONDS, 60),
  geoIpLookupUrl: process.env.GEO_IP_LOOKUP_URL || 'http://ip-api.com/json/{ip}?lang=zh-CN',
  geoIpLookupTimeoutMs: toNumber(process.env.GEO_IP_LOOKUP_TIMEOUT_MS, 800),
  geoIpCacheTtlSeconds: toNumber(process.env.GEO_IP_CACHE_TTL_SECONDS, 60 * 60 * 24),
  adminSessionTtlSeconds: toNumber(process.env.ADMIN_SESSION_TTL_SECONDS, 60 * 60 * 8),
  visitorCookieName: process.env.VISITOR_COOKIE_NAME || 'cq_visitor_id',
  adminCookieName: process.env.ADMIN_COOKIE_NAME || 'cq_admin_session',
}

export function assertServerConfig() {
  const missing = []

  if (!config.adminPassword) missing.push('ADMIN_PASSWORD')
  if (!config.sessionSecret) missing.push('SESSION_SECRET')

  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}`)
  }
}
