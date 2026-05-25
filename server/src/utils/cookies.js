import { config } from '../config.js'

export function buildCookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  }
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  }
}
