import assert from 'node:assert/strict'
import test from 'node:test'
import { createVisitorId, getRequestDeviceInfo, normalizeVisitorId } from './visitor.js'

test('normalizeVisitorId preserves valid generated visitor ids', () => {
  const visitorId = createVisitorId()
  assert.equal(normalizeVisitorId(visitorId), visitorId)
})

test('normalizeVisitorId replaces invalid visitor ids', () => {
  const value = 'x'.repeat(4096)
  const visitorId = normalizeVisitorId(value)

  assert.match(visitorId, /^anon_[0-9a-f-]+$/i)
  assert.notEqual(visitorId, value)
})

test('getRequestDeviceInfo builds a readable device label from headers', () => {
  const deviceInfo = getRequestDeviceInfo({
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'sec-ch-ua-platform': '"macOS"',
    },
  })

  assert.equal(deviceInfo.userAgent.includes('Chrome/125'), true)
  assert.equal(deviceInfo.deviceLabel, 'Chrome / macOS')
})
