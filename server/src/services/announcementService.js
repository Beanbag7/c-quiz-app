import fs from 'node:fs/promises'
import path from 'node:path'

const DATA_FILE = process.env.ANNOUNCEMENTS_FILE || path.join(process.cwd(), 'server', 'data', 'announcement.json')
const VALID_LEVELS = new Set(['info', 'success', 'warning', 'danger'])
const TITLE_MAX_LENGTH = 80
const CONTENT_MAX_LENGTH = 1200

function nowIso() {
  return new Date().toISOString()
}

function trimText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeAnnouncement(input = {}, previous = null) {
  const title = trimText(input.title, TITLE_MAX_LENGTH)
  const content = trimText(input.content, CONTENT_MAX_LENGTH)
  const level = VALID_LEVELS.has(input.level) ? input.level : 'info'
  const active = Boolean(input.active) && Boolean(title || content)
  const timestamp = nowIso()

  return {
    id: previous?.id || `announcement-${Date.now()}`,
    title,
    content,
    level,
    active,
    createdAt: previous?.createdAt || timestamp,
    updatedAt: timestamp,
    updatedBy: input.updatedBy || previous?.updatedBy || null,
  }
}

async function ensureDataDir() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
}

async function readStoredAnnouncement() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function writeStoredAnnouncement(announcement) {
  await ensureDataDir()
  const tempFile = `${DATA_FILE}.tmp`
  await fs.writeFile(tempFile, `${JSON.stringify(announcement, null, 2)}\n`, 'utf8')
  await fs.rename(tempFile, DATA_FILE)
}

export async function getPublicAnnouncement() {
  const announcement = await readStoredAnnouncement()
  if (!announcement?.active) return null
  if (!announcement.title && !announcement.content) return null
  return announcement
}

export async function getAdminAnnouncement() {
  return readStoredAnnouncement()
}

export async function publishAnnouncement(input) {
  const previous = await readStoredAnnouncement()
  const announcement = normalizeAnnouncement(input, previous)
  await writeStoredAnnouncement(announcement)
  return announcement
}

export async function clearAnnouncement(updatedBy = null) {
  const previous = await readStoredAnnouncement()
  const announcement = normalizeAnnouncement(
    {
      title: previous?.title || '',
      content: previous?.content || '',
      level: previous?.level || 'info',
      active: false,
      updatedBy,
    },
    previous
  )
  await writeStoredAnnouncement(announcement)
  return announcement
}
