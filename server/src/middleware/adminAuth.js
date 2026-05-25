import { config } from '../config.js'
import { getAdminSession } from '../services/adminSessionService.js'

export async function requireAdminSession(req, res, next) {
  try {
    const session = await getAdminSession(req.cookies?.[config.adminCookieName])

    if (!session) {
      return res.status(401).json({ error: 'Admin session required' })
    }

    req.adminSession = session
    return next()
  } catch (error) {
    return next(error)
  }
}
