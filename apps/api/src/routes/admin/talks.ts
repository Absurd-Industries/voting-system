import { Hono } from 'hono'
import { getConference, getTalksWithVoteCounts } from '../../db/queries.js'
import type { Bindings, Variables } from '../../index.js'
import { parseAndValidateCsv } from '../../lib/csv.js'

const adminTalks = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminTalks.get('/', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const { results } = await getTalksWithVoteCounts(c.env.DB, conf.id)
  return c.json(results)
})

adminTalks.post('/', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const body = await c.req.json<{
    title: string
    description?: string
    duration_minutes: number
    presenter_name: string
    presenter_bio?: string
    presenter_email?: string
  }>()

  const errors: string[] = []
  if (!body.title?.trim()) errors.push('title is required')
  if (!body.presenter_name?.trim()) errors.push('presenter_name is required')
  if (!Number.isInteger(body.duration_minutes) || body.duration_minutes <= 0) {
    errors.push('duration_minutes must be a positive integer')
  }
  if (errors.length > 0) return c.json({ error: errors.join(', ') }, 422)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO talks (id, conference_id, title, description, duration_minutes, presenter_name, presenter_bio, presenter_email, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, conf.id,
    body.title.trim(),
    body.description ?? null,
    body.duration_minutes,
    body.presenter_name.trim(),
    body.presenter_bio ?? null,
    body.presenter_email ?? null,
    Date.now()
  ).run()

  const talk = await c.env.DB.prepare('SELECT * FROM talks WHERE id = ?').bind(id).first()
  return c.json(talk, 201)
})

adminTalks.post('/import', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const contentType = c.req.header('content-type') ?? ''
  let csvText: string

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    csvText = await c.req.text()
  } else {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return c.json({ error: 'Send CSV as file upload (multipart/form-data field "file") or text/csv body' }, 422)
    }
    csvText = await (file as File).text()
  }

  const { rows, errors } = parseAndValidateCsv(csvText)

  if (errors.length > 0) {
    return c.json({ error: 'CSV validation failed', details: errors }, 422)
  }

  if (rows.length === 0) {
    return c.json({ error: 'CSV contains no data rows' }, 422)
  }

  const now = Date.now()
  const stmts = rows.map(row =>
    c.env.DB.prepare(`
      INSERT INTO talks (id, conference_id, title, description, duration_minutes, presenter_name, presenter_bio, presenter_email, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), conf.id,
      row.title, row.description, row.duration_minutes,
      row.presenter_name, row.presenter_bio, row.presenter_email,
      now
    )
  )

  await c.env.DB.batch(stmts)

  return c.json({ ok: true, imported: rows.length }, 201)
})

adminTalks.put('/:id', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const talkId = c.req.param('id')
  const existing = await c.env.DB.prepare(
    'SELECT id FROM talks WHERE id = ? AND conference_id = ?'
  ).bind(talkId, conf.id).first()
  if (!existing) return c.json({ error: 'Talk not found' }, 404)

  const body = await c.req.json<{
    title?: string
    description?: string
    duration_minutes?: number
    presenter_name?: string
    presenter_bio?: string
    presenter_email?: string
  }>()

  if (body.duration_minutes !== undefined && (!Number.isInteger(body.duration_minutes) || body.duration_minutes <= 0)) {
    return c.json({ error: 'duration_minutes must be a positive integer' }, 422)
  }

  await c.env.DB.prepare(`
    UPDATE talks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      duration_minutes = COALESCE(?, duration_minutes),
      presenter_name = COALESCE(?, presenter_name),
      presenter_bio = COALESCE(?, presenter_bio),
      presenter_email = COALESCE(?, presenter_email)
    WHERE id = ?
  `).bind(
    body.title ?? null,
    body.description ?? null,
    body.duration_minutes ?? null,
    body.presenter_name ?? null,
    body.presenter_bio ?? null,
    body.presenter_email ?? null,
    talkId
  ).run()

  const updated = await c.env.DB.prepare('SELECT * FROM talks WHERE id = ?').bind(talkId).first()
  return c.json(updated)
})

adminTalks.delete('/:id', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const talkId = c.req.param('id')
  const existing = await c.env.DB.prepare(
    'SELECT id FROM talks WHERE id = ? AND conference_id = ?'
  ).bind(talkId, conf.id).first()
  if (!existing) return c.json({ error: 'Talk not found' }, 404)

  // ON DELETE CASCADE in schema means votes are deleted automatically
  await c.env.DB.prepare('DELETE FROM talks WHERE id = ?').bind(talkId).run()

  return c.json({ ok: true })
})

export default adminTalks
