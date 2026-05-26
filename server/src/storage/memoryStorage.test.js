import assert from 'node:assert/strict'
import test from 'node:test'
import { memoryStorage } from './memoryStorage.js'

test('memory storage supports visitor hash and sorted-set semantics', async () => {
  memoryStorage.clear()

  assert.equal(await memoryStorage.exists('visitor:a'), 0)
  await memoryStorage.hSet('visitor:a', { visitorId: 'a', lastScope: 'home' })
  assert.equal(await memoryStorage.hIncrBy('visitor:a', 'heartbeatCount', 1), 1)
  assert.equal(await memoryStorage.exists('visitor:a'), 1)

  assert.deepEqual(await memoryStorage.hGetAll('visitor:a'), {
    visitorId: 'a',
    lastScope: 'home',
    heartbeatCount: '1',
  })

  await memoryStorage.zAdd('visitor:index', [
    { score: 100, value: 'a' },
    { score: 200, value: 'b' },
    { score: 150, value: 'c' },
  ])

  assert.deepEqual(await memoryStorage.zRange('visitor:index', 0, -1), ['a', 'c', 'b'])
  assert.deepEqual(await memoryStorage.zRange('visitor:index', 0, 1, { REV: true }), ['b', 'c'])

  assert.equal(await memoryStorage.zRemRangeByScore('visitor:index', 0, 150), 2)
  assert.deepEqual(await memoryStorage.zRange('visitor:index', 0, -1), ['b'])
})

test('memory storage expires keys', async () => {
  memoryStorage.clear()

  await memoryStorage.hSet('session:a', { isAdmin: 'true' })
  assert.equal(await memoryStorage.expire('session:a', 0.001), 1)

  await new Promise((resolve) => setTimeout(resolve, 5))

  assert.equal(await memoryStorage.exists('session:a'), 0)
  assert.deepEqual(await memoryStorage.hGetAll('session:a'), {})
})

test('memory storage caps sorted sets to bound degraded-mode memory use', async () => {
  memoryStorage.clear()

  const members = Array.from({ length: 5005 }, (_, index) => ({
    score: index,
    value: `visitor:${index}`,
  }))

  await memoryStorage.zAdd('presence:home', members)

  const values = await memoryStorage.zRange('presence:home', 0, -1)
  assert.equal(values.length, 5000)
  assert.equal(values[0], 'visitor:5')
})
