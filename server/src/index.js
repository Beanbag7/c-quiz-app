import { createApp } from './app.js'
import { assertServerConfig, config } from './config.js'

assertServerConfig()

const app = createApp()

app.listen(config.port, config.host, () => {
  console.log(`[server] listening on http://${config.host}:${config.port}`)
})
