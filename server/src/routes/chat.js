import { Router } from 'express'
import { getRecentMessages, getOnlineCount, getOnlineUsers, recordScore, getTopScores } from '../services/chatService.js'

export const chatRouter = Router()

// GET /api/chat/messages
chatRouter.get('/messages', (_req, res) => {
  const limit = Math.min(Math.max(Number(_req.query.limit) || 50, 1), 200)
  const messages = getRecentMessages(limit)
  return res.json({ ok: true, messages })
})

// GET /api/chat/online — 在线人数（统一数据源：WebSocket 连接数）
chatRouter.get('/online', (_req, res) => {
  return res.json({
    ok: true,
    onlineCount: getOnlineCount(),
    onlineUsers: getOnlineUsers(),
  })
})

// POST /api/chat/score — 上报答题得分
chatRouter.post('/score', (req, res) => {
  const { userId, score, subject } = req.body || {}
  if (!userId || score == null) {
    return res.status(400).json({ error: 'userId and score required' })
  }
  recordScore(String(userId), Number(score), String(subject || ''))
  return res.json({ ok: true })
})

// GET /api/chat/leaderboard — 排行榜 Top N
chatRouter.get('/leaderboard', async (_req, res) => {
  try {
    const limit = Math.min(Math.max(Number(_req.query.limit) || 10, 1), 50)
    const top = await getTopScores(limit)
    return res.json({ ok: true, items: top })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})
