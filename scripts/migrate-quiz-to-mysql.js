#!/usr/bin/env node
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { migrateJsonBanks } = await import('../server/src/db/migrate.js')

const banksDir = path.join(__dirname, '..', 'public')

console.log('[migrate] Starting quiz bank migration...')
console.log(`[migrate] Source directory: ${banksDir}`)

try {
  const total = await migrateJsonBanks(banksDir)
  console.log(`[migrate] Migration completed successfully. ${total} questions imported.`)
  process.exit(0)
} catch (error) {
  console.error('[migrate] Migration FAILED:', error.message)
  console.error(error.stack)
  process.exit(1)
}
