import { createClient } from 'redis'
import { config } from '../config.js'

let client
let connecting
let loggedConnectionError = false

export function isRedisConfigured() {
  return Boolean(config.redisUrl)
}

export async function getRedisClient() {
  if (!isRedisConfigured()) {
    throw new Error('REDIS_URL is unset')
  }

  if (!client) {
    client = createClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: false,
      },
    })
    client.on('error', (error) => {
      if (loggedConnectionError) return

      loggedConnectionError = true
      console.error('[redis] connection error', error.message)
    })
  }

  if (!client.isOpen) {
    connecting ||= client.connect().finally(() => {
      connecting = undefined
    })
    await connecting
  }

  return client
}

export async function closeRedisClient() {
  if (client?.isOpen) {
    await client.quit()
  }
  client = undefined
  connecting = undefined
  loggedConnectionError = false
}
