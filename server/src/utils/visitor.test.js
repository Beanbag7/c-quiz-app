import assert from 'node:assert/strict'
import test from 'node:test'
import { createVisitorId, normalizeVisitorId } from './visitor.js'

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
