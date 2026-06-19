import { createServer } from 'node:http'
import { createApp } from './app.js'
import { assertServerConfig, config } from './config.js'
import { initChatServer } from './ws/chatServer.js'

assertServerConfig()

const app = createApp()
const server = createServer(app)
await initChatServer(server)

server.listen(config.port, config.host, () => {
  console.log(`[server] listening on http://${config.host}:${config.port}`)
})
