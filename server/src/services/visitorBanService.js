import { withStorageOperation } from '../storage/index.js'

const banIndexKey = 'visitor-ban:index'

function banKey(targetType, targetValue) {
  return `visitor-ban:${targetType}:${encodeURIComponent(String(targetValue || '').trim())}`
}

function normalizeTargetType(targetType) {
  if (targetType === 'visitorId' || targetType === 'deviceId') return 'deviceId'
  if (targetType === 'ip' || targetType === 'ipAddress') return 'ipAddress'
  return null
}

function normalizeTargetValue(targetValue) {
  return typeof targetValue === 'string' ? targetValue.trim() : ''
}

function parseExpiresAt(value) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function isBanActiveRecord(record, now = new Date()) {
  if (!record?.targetType || !record?.targetValue) return false
  if (record.status !== 'active') return false

  const expiresAt = parseExpiresAt(record.expiresAt)
  if (!expiresAt) return true

  return expiresAt.getTime() > now.getTime()
}

function formatBanRecord(record, now = new Date()) {
  if (!record?.targetType || !record?.targetValue) return null

  const expiresAt = parseExpiresAt(record.expiresAt)
  const active = isBanActiveRecord(record, now)

  return {
    targetType: record.targetType,
    targetValue: record.targetValue,
    status: active ? 'active' : (record.status || 'revoked'),
    reason: record.reason || '',
    createdAt: record.createdAt || null,
    createdBy: record.createdBy || null,
    revokedAt: record.revokedAt || null,
    revokedBy: record.revokedBy || null,
    expiresAt: expiresAt ? expiresAt.toISOString() : (record.expiresAt || null),
    updatedAt: record.updatedAt || null,
    active,
  }
}

async function readBanRecord(storage, targetType, targetValue) {
  const normalizedType = normalizeTargetType(targetType)
  const normalizedValue = normalizeTargetValue(targetValue)
  if (!normalizedType || !normalizedValue) return null

  return storage.hGetAll(banKey(normalizedType, normalizedValue))
}

async function writeBanIndex(storage, key, now) {
  await storage.zAdd(banIndexKey, [{ score: now.getTime(), value: key }])
}

function isBanKey(value) {
  return typeof value === 'string' && value.startsWith('visitor-ban:')
}

async function listBanKeys(storage) {
  return storage.zRange(banIndexKey, 0, -1, { REV: true })
}

export async function getBanStatus(storage, { visitorId, ipAddress, now = new Date() }) {
  const deviceRecord = await readBanRecord(storage, 'deviceId', visitorId)
  const ipRecord = ipAddress ? await readBanRecord(storage, 'ipAddress', ipAddress) : null

  const deviceBan = formatBanRecord(deviceRecord, now)
  const ipBan = formatBanRecord(ipRecord, now)

  return {
    deviceBan,
    ipBan,
    isBanned: Boolean(deviceBan?.active || ipBan?.active),
  }
}

export async function setVisitorBan({ targetType, targetValue, reason = '', createdBy = '', now = new Date(), expiresAt = null }) {
  const normalizedType = normalizeTargetType(targetType)
  const normalizedValue = normalizeTargetValue(targetValue)

  if (!normalizedType || !normalizedValue) {
    const error = new Error('Invalid ban target')
    error.statusCode = 400
    throw error
  }

  return withStorageOperation(async (storage) => {
    const key = banKey(normalizedType, normalizedValue)
    const existing = await storage.hGetAll(key)
    const createdAt = existing.createdAt || now.toISOString()
    const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : (existing.expiresAt || '')

    const record = {
      targetType: normalizedType,
      targetValue: normalizedValue,
      status: 'active',
      reason: reason || existing.reason || '',
      createdAt,
      createdBy: existing.createdBy || createdBy || 'system',
      updatedAt: now.toISOString(),
      revokedAt: '',
      revokedBy: '',
      expiresAt: expiresAtIso,
    }

    await storage.hSet(key, record)
    await writeBanIndex(storage, key, now)

    return formatBanRecord(record, now)
  })
}

export async function clearVisitorBan({ targetType, targetValue, revokedBy = '', now = new Date() }) {
  const normalizedType = normalizeTargetType(targetType)
  const normalizedValue = normalizeTargetValue(targetValue)

  if (!normalizedType || !normalizedValue) {
    const error = new Error('Invalid ban target')
    error.statusCode = 400
    throw error
  }

  return withStorageOperation(async (storage) => {
    const key = banKey(normalizedType, normalizedValue)
    const existing = await storage.hGetAll(key)
    if (!existing.targetType || !existing.targetValue) {
      return null
    }

    const record = {
      targetType: existing.targetType || normalizedType,
      targetValue: existing.targetValue || normalizedValue,
      status: 'revoked',
      reason: existing.reason || '',
      createdAt: existing.createdAt || null,
      createdBy: existing.createdBy || null,
      updatedAt: now.toISOString(),
      revokedAt: now.toISOString(),
      revokedBy: revokedBy || 'system',
      expiresAt: existing.expiresAt || '',
    }

    await storage.hSet(key, record)
    await writeBanIndex(storage, key, now)

    return formatBanRecord(record, now)
  })
}

export async function listVisitorBans({ now = new Date() } = {}) {
  return withStorageOperation(async (storage) => {
    const keys = await listBanKeys(storage)
    const uniqueKeys = [...new Set(keys)].filter(isBanKey)
    const records = await Promise.all(uniqueKeys.map((key) => storage.hGetAll(key)))

    return records
      .map((record) => formatBanRecord(record, now))
      .filter(Boolean)
      .sort((left, right) => {
        const leftTime = Date.parse(left.updatedAt || left.createdAt || 0)
        const rightTime = Date.parse(right.updatedAt || right.createdAt || 0)
        return rightTime - leftTime
      })
  })
}
