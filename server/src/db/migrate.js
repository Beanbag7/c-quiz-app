import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { withMysql } from './mysqlPool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  const statements = sql.split(';').filter((s) => s.trim().length > 0)

  await withMysql(async (conn) => {
    for (const stmt of statements) {
      await conn.query(stmt)
    }
  })
}

export async function migrateJsonBanks(banksDir) {
  const bankDefinitions = [
    { file: 'questions.json', subjectKey: 'c', name: 'C语言题库', icon: '💻', sortOrder: 1 },
    { file: 'questions_java.json', subjectKey: 'java', name: 'Java题库', icon: '☕', sortOrder: 2 },
    { file: 'questions_database.json', subjectKey: 'database', name: '数据库题库', icon: '🗄️', sortOrder: 3 },
    { file: 'kline_questions.json', subjectKey: 'kline', name: 'K线技术分析', icon: '📈', sortOrder: 4 },
    { file: 'questions_sxyz.json', subjectKey: 'sxyz', name: '形势与政策', icon: '🇨🇳', sortOrder: 5 },
    { file: 'chaoxing-quiz-bank.json', subjectKey: 'chaoxing', name: '西方文化著作导读', icon: '📚', sortOrder: 6 },
    { file: 'exam-175-question-bank.json', subjectKey: 'exam175', name: '党纪考试题库', icon: '📘', sortOrder: 7 },
    { file: 'questions_data_structure.json', subjectKey: 'ds', name: '数据结构（C语言）', icon: '🌳', sortOrder: 8 },
    { file: 'questions_computer_organization.json', subjectKey: 'co', name: '计算机组成与系统结构', icon: '🧠', sortOrder: 9 },
  ]

  await initSchema()

  let totalImported = 0

  for (const def of bankDefinitions) {
    const fullPath = path.join(banksDir, def.file)
    if (!fs.existsSync(fullPath)) {
      console.log(`[migrate] SKIP ${def.file} (not found)`)
      continue
    }

    const raw = fs.readFileSync(fullPath, 'utf8')
    const data = JSON.parse(raw)
    const questions = data.questions || []

    await withMysql(async (conn) => {
      const [existing] = await conn.execute(
        `SELECT id FROM quiz_banks WHERE subject_key = ? LIMIT 1`,
        [def.subjectKey]
      )

      let bankId

      if (existing.length > 0) {
        bankId = existing[0].id
        await conn.execute(`DELETE FROM questions WHERE bank_id = ?`, [bankId])
        console.log(`[migrate] REPLACING bank "${def.name}" (id=${bankId})`)
      } else {
        const [result] = await conn.execute(
          `INSERT INTO quiz_banks (subject_key, name, icon, sort_order) VALUES (?, ?, ?, ?)`,
          [def.subjectKey, def.name, def.icon, def.sortOrder]
        )
        bankId = result.insertId
        console.log(`[migrate] CREATED bank "${def.name}" (id=${bankId})`)
      }

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

      totalImported += questions.length
      console.log(`[migrate] IMPORTED ${questions.length} questions into "${def.name}"`)
    })
  }

  console.log(`[migrate] DONE. Total questions imported: ${totalImported}`)
  return totalImported
}
