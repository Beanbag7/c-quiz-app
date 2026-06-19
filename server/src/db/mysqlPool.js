import mysql from 'mysql2/promise'
import { config } from '../config.js'

let pool = null

export function getMysqlPool() {
  if (pool) return pool

  pool = mysql.createPool({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  })

  return pool
}

export async function withMysql(fn) {
  const p = getMysqlPool()
  const conn = await p.getConnection()
  try {
    return await fn(conn)
  } finally {
    conn.release()
  }
}

export async function closeMysqlPool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
