import { createApp } from './app.js'
import { assertServerConfig, config } from './config.js'

assertServerConfig()

const app = createApp()

app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`)
})
