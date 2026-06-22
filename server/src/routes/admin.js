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
import { clearVisitorBan, listVisitorBans, setVisitorBan } from '../services/visitorBanService.js'
import {
  listBanks,
  createBank,
  updateBank,
  deleteBank,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  replaceBankQuestions,
} from '../services/quizBankService.js'
import {
  clearAnnouncement,
  getAdminAnnouncement,
  publishAnnouncement,
} from '../services/announcementService.js'
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

adminRouter.get('/bans', requireAdminSession, async (_req, res, next) => {
  try {
    const bans = await listVisitorBans()
    return res.json({ ok: true, items: bans })
  } catch (error) {
    return next(error)
  }
})

adminRouter.get('/announcement', requireAdminSession, async (_req, res, next) => {
  try {
    const announcement = await getAdminAnnouncement()
    return res.json({ ok: true, announcement })
  } catch (error) {
    return next(error)
  }
})

adminRouter.put('/announcement', requireAdminSession, async (req, res, next) => {
  try {
    const announcement = await publishAnnouncement({
      ...req.body,
      updatedBy: req.adminSession?.sessionId,
    })
    return res.json({ ok: true, announcement })
  } catch (error) {
    return next(error)
  }
})

adminRouter.delete('/announcement', requireAdminSession, async (req, res, next) => {
  try {
    const announcement = await clearAnnouncement(req.adminSession?.sessionId)
    return res.json({ ok: true, announcement })
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/bans', requireAdminSession, async (req, res, next) => {
  try {
    const { targetType, targetValue, reason, expiresAt } = req.body || {}
    const ban = await setVisitorBan({
      targetType,
      targetValue,
      reason,
      expiresAt,
      createdBy: req.adminSession?.sessionId,
    })

    return res.json({ ok: true, ban })
  } catch (error) {
    return next(error)
  }
})

adminRouter.delete('/bans', requireAdminSession, async (req, res, next) => {
  try {
    const { targetType, targetValue } = req.body || {}
    const ban = await clearVisitorBan({
      targetType,
      targetValue,
      revokedBy: req.adminSession?.sessionId,
    })

    return res.json({ ok: true, ban })
  } catch (error) {
    return next(error)
  }
})

adminRouter.get('/quiz/banks', requireAdminSession, async (_req, res, next) => {
  try {
    const banks = await listBanks()
    return res.json({ ok: true, items: banks })
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/quiz/banks', requireAdminSession, async (req, res, next) => {
  try {
    const { subjectKey, name, description, icon, sortOrder } = req.body || {}
    if (!subjectKey || !name) {
      return res.status(400).json({ error: 'subjectKey and name are required' })
    }
    const bank = await createBank({ subjectKey, name, description, icon, sortOrder })
    return res.json({ ok: true, bank })
  } catch (error) {
    return next(error)
  }
})

adminRouter.put('/quiz/banks/:id', requireAdminSession, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const result = await updateBank(id, req.body || {})
    return res.json({ ok: true, result })
  } catch (error) {
    return next(error)
  }
})

adminRouter.delete('/quiz/banks/:id', requireAdminSession, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const result = await deleteBank(id)
    return res.json({ ok: true, result })
  } catch (error) {
    return next(error)
  }
})

adminRouter.get('/quiz/banks/:id/questions', requireAdminSession, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const questions = await listQuestions(id)
    return res.json({ ok: true, questions })
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/quiz/banks/:id/questions', requireAdminSession, async (req, res, next) => {
  try {
    const bankId = Number(req.params.id)
    const result = await createQuestion(bankId, req.body || {})
    return res.json({ ok: true, question: result })
  } catch (error) {
    return next(error)
  }
})

adminRouter.put('/quiz/banks/:bankId/questions/:questionId', requireAdminSession, async (req, res, next) => {
  try {
    const bankId = Number(req.params.bankId)
    const questionId = Number(req.params.questionId)
    const result = await updateQuestion(bankId, questionId, req.body || {})
    return res.json({ ok: true, result })
  } catch (error) {
    return next(error)
  }
})

adminRouter.delete('/quiz/banks/:bankId/questions/:questionId', requireAdminSession, async (req, res, next) => {
  try {
    const bankId = Number(req.params.bankId)
    const questionId = Number(req.params.questionId)
    const result = await deleteQuestion(bankId, questionId)
    return res.json({ ok: true, result })
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/quiz/banks/:id/import', requireAdminSession, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { questions } = req.body || {}
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions array is required' })
    }
    const result = await replaceBankQuestions(id, questions)
    return res.json({ ok: true, result })
  } catch (error) {
    return next(error)
  }
})
