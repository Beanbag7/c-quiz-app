import express from 'express'
import cookieParser from 'cookie-parser'
import { visitorsRouter } from './routes/visitors.js'
import { adminRouter } from './routes/admin.js'
import { quizRouter } from './routes/quiz.js'
import { chatRouter } from './routes/chat.js'
import { announcementsRouter } from './routes/announcements.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(express.json({ limit: '32kb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/visitors', visitorsRouter)
  app.use('/api/quiz', quizRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/chat', chatRouter)
  app.use('/api/announcements', announcementsRouter)

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
  })

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500
    const message = statusCode >= 500 ? 'Server error' : error.message

    if (statusCode >= 500) {
      console.error('[server] request failed', error.message)
    }

    res.status(statusCode).json({ error: message })
  })

  return app
}
