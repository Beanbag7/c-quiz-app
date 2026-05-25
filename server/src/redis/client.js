import { createClient } from 'redis'
import { config, assertRedisConfig } from '../config.js'

let client
let connecting

export async function getRedisClient() {
  assertRedisConfig()

  if (!client) {
    client = createClient({ url: config.redisUrl })
    client.on('error', (error) => {
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
}
