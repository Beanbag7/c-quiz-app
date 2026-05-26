const MAX_VISITOR_HASH_KEYS = 5000
const MAX_ADMIN_SESSION_KEYS = 256
const MAX_SORTED_SET_MEMBERS = 5000

class InMemoryStorage {
  constructor() {
    this.hashes = new Map()
    this.sortedSets = new Map()
    this.expirations = new Map()
  }

  async hSet(key, values) {
    this.cleanupKey(key)
    const hash = this.hashes.get(key) || {}

    for (const [field, value] of Object.entries(values)) {
      hash[field] = String(value)
    }

    this.hashes.set(key, hash)
    this.enforceHashLimit(key)
    return Object.keys(values).length
  }

  async hGetAll(key) {
    this.cleanupKey(key)
    return { ...(this.hashes.get(key) || {}) }
  }

  async hIncrBy(key, field, increment) {
    this.cleanupKey(key)
    const hash = this.hashes.get(key) || {}
    const nextValue = Number(hash[field] || 0) + Number(increment)
    hash[field] = String(nextValue)
    this.hashes.set(key, hash)
    this.enforceHashLimit(key)
    return nextValue
  }

  async exists(key) {
    this.cleanupKey(key)
    return this.hashes.has(key) || this.sortedSets.has(key) ? 1 : 0
  }

  async del(key) {
    this.cleanupKey(key)
    const deleted = Number(this.hashes.delete(key) || this.sortedSets.delete(key))
    this.expirations.delete(key)
    return deleted
  }

  async expire(key, seconds) {
    this.cleanupKey(key)
    if (!(await this.exists(key))) return 0

    this.expirations.set(key, Date.now() + Number(seconds) * 1000)
    return 1
  }

  async zAdd(key, members) {
    this.cleanupKey(key)
    const sortedSet = this.sortedSets.get(key) || new Map()

    for (const member of members) {
      sortedSet.set(String(member.value), Number(member.score))
    }

    this.sortedSets.set(key, sortedSet)
    this.enforceSortedSetLimit(sortedSet)
    return members.length
  }

  async zRange(key, start, stop, options = {}) {
    this.cleanupKey(key)
    const sortedSet = this.sortedSets.get(key)
    if (!sortedSet) return []

    const entries = [...sortedSet.entries()].sort((left, right) => {
      const scoreDelta = left[1] - right[1]
      if (scoreDelta !== 0) return scoreDelta
      return left[0].localeCompare(right[0])
    })

    if (options.REV) entries.reverse()

    const normalizedStart = normalizeIndex(start, entries.length)
    const normalizedStop = normalizeIndex(stop, entries.length)
    if (normalizedStart > normalizedStop) return []

    return entries.slice(normalizedStart, normalizedStop + 1).map(([value]) => value)
  }

  async zRemRangeByScore(key, min, max) {
    this.cleanupKey(key)
    const sortedSet = this.sortedSets.get(key)
    if (!sortedSet) return 0

    let removed = 0
    for (const [value, score] of sortedSet.entries()) {
      if (score >= Number(min) && score <= Number(max)) {
        sortedSet.delete(value)
        removed += 1
      }
    }

    if (sortedSet.size === 0) this.sortedSets.delete(key)
    return removed
  }

  clear() {
    this.hashes.clear()
    this.sortedSets.clear()
    this.expirations.clear()
  }

  cleanupKey(key) {
    const expiresAt = this.expirations.get(key)
    if (!expiresAt || expiresAt > Date.now()) return

    this.hashes.delete(key)
    this.sortedSets.delete(key)
    this.expirations.delete(key)
  }

  enforceHashLimit(key) {
    if (key.startsWith('visitor:')) {
      this.evictOldestMatchingKey('visitor:', MAX_VISITOR_HASH_KEYS)
      return
    }

    if (key.startsWith('admin-session:')) {
      this.evictOldestMatchingKey('admin-session:', MAX_ADMIN_SESSION_KEYS)
    }
  }

  evictOldestMatchingKey(prefix, maxCount) {
    const matchingKeys = [...this.hashes.keys()].filter((hashKey) => hashKey.startsWith(prefix))
    const overflow = matchingKeys.length - maxCount
    if (overflow <= 0) return

    for (const hashKey of matchingKeys.slice(0, overflow)) {
      this.hashes.delete(hashKey)
      this.expirations.delete(hashKey)
    }
  }

  enforceSortedSetLimit(sortedSet) {
    if (sortedSet.size <= MAX_SORTED_SET_MEMBERS) return

    const oldestEntries = [...sortedSet.entries()]
      .sort((left, right) => left[1] - right[1])
      .slice(0, sortedSet.size - MAX_SORTED_SET_MEMBERS)

    for (const [value] of oldestEntries) {
      sortedSet.delete(value)
    }
  }
}

function normalizeIndex(index, length) {
  const numericIndex = Number(index)
  if (numericIndex < 0) return Math.max(0, length + numericIndex)
  return Math.min(length, numericIndex)
}

export const memoryStorage = new InMemoryStorage()
