import crypto from 'node:crypto'

export const VISITOR_SCOPES = new Set(['home', 'quiz'])

export function createVisitorId() {
  return `anon_${crypto.randomUUID()}`
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
    country: headerValue(req, ['cf-ipcountry', 'x-geo-country']) || 'Unknown',
    region: headerValue(req, ['x-geo-region']) || 'Unknown',
    city: headerValue(req, ['x-geo-city']) || 'Unknown',
  }
}

function headerValue(req, names) {
  for (const name of names) {
    const value = req.headers[name]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}
