import assert from 'node:assert/strict'
import test from 'node:test'
import { config } from '../config.js'
import { closeStorage, getStorage } from '../storage/index.js'
import { clearVisitorBan, getBanStatus, listVisitorBans, setVisitorBan } from './visitorBanService.js'

test('visitor ban service blocks and unblocks device ids', async () => {
  await closeStorage()

  const originalRedisUrl = config.redisUrl
  config.redisUrl = undefined

  try {
    const visitorId = 'anon_44444444-4444-4444-8444-444444444444'

    const created = await setVisitorBan({
      targetType: 'deviceId',
      targetValue: visitorId,
      reason: 'test device ban',
      createdBy: 'test-admin',
      now: new Date('2026-05-30T00:00:00.000Z'),
    })

    assert.equal(created.active, true)
    assert.equal(created.targetType, 'deviceId')
    assert.equal(created.targetValue, visitorId)

    const storage = await getStorage()
    const activeStatus = await getBanStatus(storage, { visitorId, ipAddress: '1.1.1.1' })

    assert.equal(activeStatus.isBanned, true)
    assert.equal(activeStatus.deviceBan.active, true)
    assert.equal(activeStatus.deviceBan.reason, 'test device ban')
    assert.equal(activeStatus.ipBan, null)

    const listed = await listVisitorBans()
    assert.equal(listed.length, 1)
    assert.equal(listed[0].targetValue, visitorId)
    assert.equal(listed[0].reason, 'test device ban')

    const revoked = await clearVisitorBan({
      targetType: 'deviceId',
      targetValue: visitorId,
      revokedBy: 'test-admin',
      now: new Date('2026-05-30T00:01:00.000Z'),
    })

    assert.equal(revoked.active, false)
    assert.equal(revoked.status, 'revoked')

    const clearedStatus = await getBanStatus(storage, { visitorId, ipAddress: '1.1.1.1' })
    assert.equal(clearedStatus.isBanned, false)
    assert.equal(clearedStatus.deviceBan.active, false)

    const listedAfterRevoke = await listVisitorBans()
    assert.equal(listedAfterRevoke[0].status, 'revoked')
  } finally {
    config.redisUrl = originalRedisUrl
    await closeStorage()
  }
})

test('visitor ban service blocks exact IP addresses', async () => {
  await closeStorage()

  const originalRedisUrl = config.redisUrl
  config.redisUrl = undefined

  try {
    await setVisitorBan({
      targetType: 'ipAddress',
      targetValue: '8.8.8.8',
      reason: 'test ip ban',
      createdBy: 'test-admin',
    })

    const storage = await getStorage()
    const status = await getBanStatus(storage, {
      visitorId: 'anon_55555555-5555-4555-8555-555555555555',
      ipAddress: '8.8.8.8',
    })

    assert.equal(status.isBanned, true)
    assert.equal(status.deviceBan, null)
    assert.equal(status.ipBan.active, true)
    assert.equal(status.ipBan.targetType, 'ipAddress')
  } finally {
    config.redisUrl = originalRedisUrl
    await closeStorage()
  }
})
