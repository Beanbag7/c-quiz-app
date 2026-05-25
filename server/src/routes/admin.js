import { Router } from 'express'
import { config } from '../config.js'
import { requireAdminSession } from '../middleware/adminAuth.js'
import {
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
  verifyAdminPassword,
} from '../services/adminSessionService.js'
import { listVisitorRecords } from '../services/visitorLogService.js'
import { buildCookieOptions, clearCookieOptions } from '../utils/cookies.js'

export const adminRouter = Router()

adminRouter.post('/login', async (req, res, next) => {
  try {
    if (!verifyAdminPassword(req.body?.password)) {
      return res.status(401).json({ ok: false, authenticated: false, error: 'Invalid admin password' })
    }

    const session = await createAdminSession()
    res.cookie(config.adminCookieName, session.token, buildCookieOptions(config.adminSessionTtlSeconds))

    return res.json({ ok: true, authenticated: true })
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/logout', async (req, res, next) => {
  try {
    await deleteAdminSession(req.cookies?.[config.adminCookieName])
    res.clearCookie(config.adminCookieName, clearCookieOptions())
    return res.json({ ok: true, authenticated: false })
  } catch (error) {
    return next(error)
  }
})

adminRouter.get('/session', async (req, res, next) => {
  try {
    const session = await getAdminSession(req.cookies?.[config.adminCookieName])
    return res.json({ authenticated: Boolean(session), session })
  } catch (error) {
    return next(error)
  }
})

adminRouter.get('/visitors', requireAdminSession, async (req, res, next) => {
  try {
    const result = await listVisitorRecords({ cursor: req.query.cursor, limit: req.query.limit })
    return res.json(result)
  } catch (error) {
    return next(error)
  }
})
