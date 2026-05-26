import crypto from 'node:crypto'

export const VISITOR_SCOPES = new Set(['home', 'quiz'])

export function createVisitorId() {
  return `anon_${crypto.randomUUID()}`
}

export function normalizeVisitorId(value) {
  return isValidVisitorId(value) ? value : createVisitorId()
}

export function isValidVisitorId(value) {
  return typeof value === 'string' && /^anon_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function isValidScope(scope) {
  return VISITOR_SCOPES.has(scope)
}

export function maskIp(ipAddress) {
  if (!ipAddress) return 'unknown'

  const normalized = ipAddress.replace(/^::ffff:/, '').trim()

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    const [first, second] = normalized.split('.')
    return `${first}.${second}.*.*`
  }

  if (normalized.includes(':')) {
    return `${normalized.split(':').slice(0, 4).join(':')}::*`
  }

  return 'unknown'
}

export function getRequestIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  return req.socket?.remoteAddress || ''
}

export function getRequestOrigin(req) {
  return {
    country: localizeGeoValue(headerValue(req, ['cf-ipcountry', 'x-geo-country']), '国家'),
    region: localizeGeoValue(headerValue(req, ['x-geo-region']), '地区'),
    city: localizeGeoValue(headerValue(req, ['x-geo-city']), '城市'),
  }
}

const GEO_NAME_MAP = new Map([
  ['CN', '中国'],
  ['CHINA', '中国'],
  ['GUANGDONG', '广东'],
  ['SHENZHEN', '深圳'],
  ['BEIJING', '北京'],
  ['SHANGHAI', '上海'],
  ['HANGZHOU', '杭州'],
  ['GUANGZHOU', '广州'],
  ['US', '美国'],
  ['UNITED STATES', '美国'],
])

function headerValue(req, names) {
  for (const name of names) {
    const value = req.headers[name]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function localizeGeoValue(value, fallback) {
  if (!value) return `未知${fallback}`
  return GEO_NAME_MAP.get(value.trim().toUpperCase()) || value.trim()
}
