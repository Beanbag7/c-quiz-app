import { Router } from 'express'
import { listBanks, getQuestionsBySubject } from '../services/quizBankService.js'

export const quizRouter = Router()

quizRouter.get('/banks', async (_req, res, next) => {
  try {
    const banks = await listBanks()
    return res.json({ ok: true, items: banks })
  } catch (error) {
    return next(error)
  }
})

quizRouter.get('/banks/:subject/questions', async (req, res, next) => {
  try {
    const questions = await getQuestionsBySubject(req.params.subject)
    if (questions === null) {
      return res.status(404).json({ error: 'Bank not found' })
    }
    return res.json({ ok: true, questions })
  } catch (error) {
    return next(error)
  }
})
