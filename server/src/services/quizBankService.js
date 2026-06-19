import { withMysql } from '../db/mysqlPool.js'

// ─── Banks ───

export async function listBanks() {
  return withMysql(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT b.*, (SELECT COUNT(*) FROM questions q WHERE q.bank_id = b.id) AS question_count
       FROM quiz_banks b ORDER BY b.sort_order ASC, b.id ASC`
    )
    return rows.map(formatBankRow)
  })
}

export async function getBankBySubject(subjectKey) {
  return withMysql(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT * FROM quiz_banks WHERE subject_key = ? LIMIT 1`,
      [subjectKey]
    )
    return rows.length > 0 ? formatBankRow(rows[0]) : null
  })
}

export async function createBank({ subjectKey, name, description, icon, sortOrder }) {
  return withMysql(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO quiz_banks (subject_key, name, description, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [subjectKey, name, description || null, icon || '📖', sortOrder || 0]
    )
    return { id: result.insertId, subjectKey, name, description, icon: icon || '📖', sortOrder: sortOrder || 0 }
  })
}

export async function updateBank(id, { name, description, icon, sortOrder }) {
  return withMysql(async (conn) => {
    const fields = []
    const values = []
    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (description !== undefined) { fields.push('description = ?'); values.push(description) }
    if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }
    if (sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(sortOrder) }
    if (fields.length === 0) return null

    values.push(id)
    await conn.execute(`UPDATE quiz_banks SET ${fields.join(', ')} WHERE id = ?`, values)
    return { id, updated: true }
  })
}

export async function deleteBank(id) {
  return withMysql(async (conn) => {
    const [result] = await conn.execute(`DELETE FROM quiz_banks WHERE id = ?`, [id])
    return { deleted: result.affectedRows > 0 }
  })
}

// ─── Questions ───

export async function listQuestions(bankId) {
  return withMysql(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT * FROM questions WHERE bank_id = ? ORDER BY seq ASC`,
      [bankId]
    )
    return rows.map(formatQuestionRow)
  })
}

export async function getQuestionsBySubject(subjectKey) {
  return withMysql(async (conn) => {
    const [banks] = await conn.execute(
      `SELECT id FROM quiz_banks WHERE subject_key = ? LIMIT 1`,
      [subjectKey]
    )
    if (banks.length === 0) return null

    const bankId = banks[0].id
    const [rows] = await conn.execute(
      `SELECT * FROM questions WHERE bank_id = ? ORDER BY seq ASC`,
      [bankId]
    )
    return rows.map(formatQuestionRow)
  })
}

export async function createQuestion(bankId, data) {
  return withMysql(async (conn) => {
    const { seq, questionType, content, options, correctAnswer, answerText, explanation, score, isRequired, chapter, questionImages } = data
    const [result] = await conn.execute(
      `INSERT INTO questions (bank_id, seq, question_type, content, options, correct_answer, answer_text, explanation, score, is_required, chapter, question_images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bankId,
        seq,
        questionType,
        content,
        options ? JSON.stringify(options) : null,
        typeof correctAnswer === 'object' ? JSON.stringify(correctAnswer) : String(correctAnswer),
        answerText,
        explanation || null,
        score ?? 1.0,
        isRequired ? 1 : 0,
        chapter || null,
        Array.isArray(questionImages) && questionImages.length > 0 ? JSON.stringify(questionImages) : null,
      ]
    )
    return { id: result.insertId, bankId, ...data }
  })
}

export async function updateQuestion(bankId, questionId, data) {
  return withMysql(async (conn) => {
    const fields = []
    const values = []
    const fieldMap = {
      seq: 'seq',
      questionType: 'question_type',
      content: 'content',
      correctAnswer: 'correct_answer',
      answerText: 'answer_text',
      explanation: 'explanation',
      score: 'score',
      isRequired: 'is_required',
      chapter: 'chapter',
    }

    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
      if (data[jsKey] !== undefined) {
        fields.push(`${dbCol} = ?`)
        let val = data[jsKey]
        if (jsKey === 'correctAnswer' && typeof val === 'object') val = JSON.stringify(val)
        if (jsKey === 'isRequired') val = val ? 1 : 0
        values.push(val)
      }
    }

    if (data.options !== undefined) {
      fields.push('options = ?')
      values.push(data.options ? JSON.stringify(data.options) : null)
    }

    if (data.questionImages !== undefined) {
      fields.push('question_images = ?')
      values.push(Array.isArray(data.questionImages) && data.questionImages.length > 0 ? JSON.stringify(data.questionImages) : null)
    }

    if (fields.length === 0) return null

    values.push(questionId, bankId)
    await conn.execute(
      `UPDATE questions SET ${fields.join(', ')} WHERE id = ? AND bank_id = ?`,
      values
    )
    return { id: questionId, bankId, updated: true }
  })
}

export async function deleteQuestion(bankId, questionId) {
  return withMysql(async (conn) => {
    const [result] = await conn.execute(
      `DELETE FROM questions WHERE id = ? AND bank_id = ?`,
      [questionId, bankId]
    )
    return { deleted: result.affectedRows > 0 }
  })
}

export async function bulkInsertQuestions(bankId, questions) {
  return withMysql(async (conn) => {
    const rows = questions.map((q, index) => [
      bankId,
      q['序号'] || index + 1,
      q['题目类型'],
      q['题目内容'],
      q['选项'] ? JSON.stringify(q['选项']) : null,
      typeof q['正确答案'] === 'object' ? JSON.stringify(q['正确答案']) : String(q['正确答案']),
      q['答案文本'] || '',
      q['解析'] || null,
      q['分值'] ?? 1.0,
      q['必考'] ? 1 : 0,
      q['章节'] || null,
      Array.isArray(q['题目图片']) && q['题目图片'].length > 0 ? JSON.stringify(q['题目图片']) : null,
    ])

    const [result] = await conn.query(
      `INSERT INTO questions (bank_id, seq, question_type, content, options, correct_answer, answer_text, explanation, score, is_required, chapter, question_images)
       VALUES ?`,
      [rows]
    )
    return { inserted: result.affectedRows }
  })
}

export async function replaceBankQuestions(bankId, questions) {
  return withMysql(async (conn) => {
    await conn.beginTransaction()
    try {
      await conn.execute(`DELETE FROM questions WHERE bank_id = ?`, [bankId])

      if (questions.length > 0) {
        const rows = questions.map((q, index) => [
          bankId,
          q['序号'] || index + 1,
          q['题目类型'],
          q['题目内容'],
          q['选项'] ? JSON.stringify(q['选项']) : null,
          typeof q['正确答案'] === 'object' ? JSON.stringify(q['正确答案']) : String(q['正确答案']),
          q['答案文本'] || '',
          q['解析'] || null,
          q['分值'] ?? 1.0,
          q['必考'] ? 1 : 0,
          q['章节'] || null,
          Array.isArray(q['题目图片']) && q['题目图片'].length > 0 ? JSON.stringify(q['题目图片']) : null,
        ])

        await conn.query(
          `INSERT INTO questions (bank_id, seq, question_type, content, options, correct_answer, answer_text, explanation, score, is_required, chapter, question_images)
           VALUES ?`,
          [rows]
        )
      }

      await conn.commit()
      return { replaced: true, count: questions.length }
    } catch (error) {
      await conn.rollback()
      throw error
    }
  })
}

export async function getBankStats(bankId) {
  return withMysql(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT question_type, COUNT(*) as count FROM questions WHERE bank_id = ? GROUP BY question_type`,
      [bankId]
    )
    const stats = {}
    let total = 0
    for (const row of rows) {
      stats[row.question_type] = row.count
      total += row.count
    }
    return { ...stats, total }
  })
}

// ─── Formatters ───

function formatBankRow(row) {
  return {
    id: row.id,
    subjectKey: row.subject_key,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    questionCount: Number(row.question_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function formatQuestionRow(row) {
  const parsedAnswer = parseJsonSafe(row.correct_answer)
  const normalizedAnswer = Array.isArray(parsedAnswer)
    ? parsedAnswer.map(v => String(v)).join('')
    : parsedAnswer

  const parsedImages = parseJsonSafe(row.question_images)
  const normalizedImages = Array.isArray(parsedImages) ? parsedImages : undefined

  return {
    id: row.id,
    bankId: row.bank_id,
    '序号': row.seq,
    '题目类型': row.question_type,
    '题目内容': row.content,
    '选项': parseJsonSafe(row.options) || undefined,
    '正确答案': normalizedAnswer,
    '答案文本': row.answer_text,
    '解析': row.explanation,
    '分值': Number(row.score),
    '必考': Boolean(row.is_required),
    '章节': row.chapter,
    '题目图片': normalizedImages,
  }
}

function parseJsonSafe(value) {
  if (!value) return value
  const str = String(value).trim()
  if (str.startsWith('[') || str.startsWith('{')) {
    try {
      return JSON.parse(str)
    } catch {}
  }
  return str
}
