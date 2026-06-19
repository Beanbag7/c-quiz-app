// 聊天消息服务：环形缓冲区 + 在线用户追踪 + 广播

const MAX_MESSAGES = 200
const ring = new Array(MAX_MESSAGES)
let head = 0
let count = 0

const clientMap = new Map() // ws → senderName

// ─── 消息存储 ───

export function addMessage(msg) {
  ring[head] = msg
  head = (head + 1) % MAX_MESSAGES
  if (count < MAX_MESSAGES) count++
}

export function getRecentMessages(n = 50) {
  const nRecent = Math.min(n, count)
  const result = new Array(nRecent)
  for (let i = 0; i < nRecent; i++) {
    const idx = (head - nRecent + i + MAX_MESSAGES) % MAX_MESSAGES
    result[i] = ring[idx]
  }
  return result
}

// ─── 用户管理 ───

export function addUser(ws, name) {
  clientMap.set(ws, name)
}

export function removeUser(ws) {
  clientMap.delete(ws)
}

export function getOnlineCount() {
  return clientMap.size
}

export function getOnlineUsers() {
  return [...clientMap.values()]
}

// ─── 广播 ───

export function broadcast(msg) {
  const payload = JSON.stringify(msg)
  for (const ws of clientMap.keys()) {
    if (ws.readyState === ws.constructor.OPEN) {
      try {
        ws.send(payload)
      } catch {
        // 忽略发送失败的客户端
      }
    }
  }
}

// ─── 排行榜 ───
// 用 Redis ZSet（如果可用）或内存 Map 作为回退
let redisClient = null

export function setRedisClient(client) {
  redisClient = client
}

const memoryScores = new Map() // userId → score

export async function recordScore(userId, score, subject) {
  if (redisClient?.isOpen) {
    try {
      await redisClient.zAdd('leaderboard:weekly', [{ score, value: userId }])
    } catch {
      // 回退到内存
      memoryScores.set(userId, Math.max(memoryScores.get(userId) || 0, score))
    }
  } else {
    memoryScores.set(userId, Math.max(memoryScores.get(userId) || 0, score))
  }
}

export async function getTopScores(n = 10) {
  if (redisClient?.isOpen) {
    try {
      return await redisClient.zRangeWithScores('leaderboard:weekly', 0, n - 1, { REV: true })
    } catch {}
  }
  // 内存回退
  return [...memoryScores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([value, score]) => ({ value, score }))
}
