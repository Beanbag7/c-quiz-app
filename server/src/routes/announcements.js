import { Router } from 'express'
import { getPublicAnnouncement } from '../services/announcementService.js'

export const announcementsRouter = Router()

announcementsRouter.get('/current', async (_req, res, next) => {
  try {
    const announcement = await getPublicAnnouncement()
    return res.json({ ok: true, announcement })
  } catch (error) {
    return next(error)
  }
})
