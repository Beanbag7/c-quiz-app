import { closeRedisClient, getRedisClient, isRedisConfigured } from '../redis/client.js'
import { memoryStorage } from './memoryStorage.js'

let fallbackActive = false
let fallbackReason

export async function getStorage() {
  return getPrimaryStorage()
}

export async function withStorageOperation(operation) {
  if (fallbackActive) return operation(memoryStorage)

  const storage = await getPrimaryStorage()
  if (storage === memoryStorage) return operation(memoryStorage)

  try {
    return await operation(storage)
  } catch (error) {
    activateFallback(`Redis command failed; retrying operation with in-memory storage (${error.message})`)
    await closeRedisClient().catch(() => {})
    return operation(memoryStorage)
  }
}

async function getPrimaryStorage() {
  if (!isRedisConfigured()) {
    activateFallback('REDIS_URL is unset; using in-memory storage')
    return memoryStorage
  }

  try {
    return await getRedisClient()
  } catch (error) {
    activateFallback(`Redis unavailable; using in-memory storage (${error.message})`)
    await closeRedisClient().catch(() => {})
    return memoryStorage
  }
}

export async function closeStorage() {
  await closeRedisClient()
  memoryStorage.clear()
  fallbackActive = false
  fallbackReason = undefined
}

export function getStorageState() {
  return {
    mode: fallbackActive ? 'memory' : 'redis',
    fallbackReason,
  }
}

function activateFallback(reason) {
  if (fallbackActive) return

  fallbackActive = true
  fallbackReason = reason
  console.warn(`[storage] ${reason}`)
}
