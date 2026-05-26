import { Router } from 'express'
import { config } from '../config.js'
import { updatePresence, getPresenceCounts } from '../services/presenceService.js'
import { recordVisitorHeartbeat } from '../services/visitorLogService.js'
import { buildCookieOptions } from '../utils/cookies.js'
import { getRequestIp, getRequestOrigin, isValidScope, maskIp, normalizeVisitorId } from '../utils/visitor.js'

export const visitorsRouter = Router()

visitorsRouter.post('/heartbeat', async (req, res, next) => {
  try {
    const { scope } = req.body || {}

    if (!isValidScope(scope)) {
      return res.status(400).json({ error: 'scope must be one of: home, quiz' })
    }

    const now = new Date()
    const visitorId = normalizeVisitorId(req.cookies?.[config.visitorCookieName])

    res.cookie(config.visitorCookieName, visitorId, buildCookieOptions(60 * 60 * 24 * 365))

    const ipAddress = getRequestIp(req)

    await recordVisitorHeartbeat({
      visitorId,
      ipAddress,
      maskedIp: maskIp(ipAddress),
      origin: getRequestOrigin(req),
      scope,
      now,
    })

    const snapshot = await updatePresence({ visitorId, scope, now })

    return res.json({
      visitorId,
      online: snapshot.online,
      observedAt: snapshot.observedAt,
    })
  } catch (error) {
    return next(error)
  }
})

visitorsRouter.get('/counts', async (_req, res, next) => {
  try {
    const snapshot = await getPresenceCounts()
    return res.json(snapshot)
  } catch (error) {
    return next(error)
  }
})
