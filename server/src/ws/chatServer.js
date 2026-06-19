import crypto from 'node:crypto'
import { WebSocketServer } from 'ws'
import { addMessage, addUser, removeUser, broadcast, getOnlineCount, getOnlineUsers, setRedisClient } from '../services/chatService.js'
import { getRedisClient, isRedisConfigured } from '../redis/client.js'

const WS_PATH = '/ws'

function makeId() {
  return crypto.randomUUID().slice(0, 8)
}

export async function initChatServer(httpServer) {
  // 尝试连接 Redis（用于排行榜），失败不影响聊天
  if (isRedisConfigured()) {
    try {
      const redis = await getRedisClient()
      setRedisClient(redis)
      console.log('[chat] Redis connected for leaderboard')
    } catch {
      console.log('[chat] Redis unavailable — leaderboard using memory')
    }
  }

  const wss = new WebSocketServer({ server: httpServer, path: WS_PATH })

  wss.on('connection', (ws) => {
    let sender = ''

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString())

        switch (data.type) {
          case 'join': {
            sender = String(data.sender || '匿名用户').trim().slice(0, 20) || '匿名用户'
            addUser(ws, sender)

            const systemMsg = {
              type: 'join',
              id: makeId(),
              sender,
              text: `${sender} 加入了聊天`,
              timestamp: new Date().toISOString(),
              onlineCount: getOnlineCount(),
              onlineUsers: getOnlineUsers(),
            }
            addMessage(systemMsg)
            broadcast(systemMsg)
            break
          }

          case 'message': {
            if (!sender) return
            const text = String(data.text || '').trim().slice(0, 500)
            if (!text) return

            const msg = {
              type: 'message',
              id: makeId(),
              sender,
              text,
              timestamp: new Date().toISOString(),
            }
            addMessage(msg)
            broadcast(msg)
            break
          }

          default:
            break
        }
      } catch {
        // 忽略无法解析的消息
      }
    })

    ws.on('close', () => {
      removeUser(ws)
      if (sender) {
        const systemMsg = {
          type: 'leave',
          id: makeId(),
          sender,
          text: `${sender} 离开了聊天`,
          timestamp: new Date().toISOString(),
          onlineCount: getOnlineCount(),
          onlineUsers: getOnlineUsers(),
        }
        addMessage(systemMsg)
        broadcast(systemMsg)
      }
    })

    ws.on('error', () => {})
  })

  console.log(`[chat] WebSocket server listening on ${WS_PATH}`)
  return wss
}
