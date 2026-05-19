import { Hono } from 'hono'
import { getConference } from '../../db/queries.js'
import type { Bindings, Variables } from '../../index.js'

const adminConference = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminConference.get('/', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json(null, 404)
  return c.json(conf)
})

adminConference.post('/', async (c) => {
  const existing = await getConference(c.env.DB)
  if (existing) return c.json({ error: 'Conference already exists. Use PUT to update.' }, 409)

  const body = await c.req.json<{
    name: string
    description?: string
    voting_opens_at?: number
    voting_closes_at?: number
    voting_force_status?: 'open' | 'closed' | 'scheduled'
  }>()

  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 422)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO conferences (id, name, description, voting_opens_at, voting_closes_at, voting_force_status, votes_per_voter, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).bind(
    id,
    body.name.trim(),
    body.description ?? null,
    body.voting_opens_at ?? null,
    body.voting_closes_at ?? null,
    body.voting_force_status ?? 'scheduled',
    Date.now()
  ).run()

  const conf = await getConference(c.env.DB)
  return c.json(conf, 201)
})

adminConference.put('/', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference exists. Use POST to create.' }, 404)

  const body = await c.req.json<{
    name?: string
    description?: string
    voting_opens_at?: number | null
    voting_closes_at?: number | null
    voting_force_status?: 'open' | 'closed' | 'scheduled'
  }>()

  await c.env.DB.prepare(`
    UPDATE conferences SET
      name = COALESCE(?, name),
      description = ?,
      voting_opens_at = ?,
      voting_closes_at = ?,
      voting_force_status = COALESCE(?, voting_force_status)
    WHERE id = ?
  `).bind(
    body.name ?? null,
    body.description !== undefined ? body.description : conf.description,
    body.voting_opens_at !== undefined ? body.voting_opens_at : conf.voting_opens_at,
    body.voting_closes_at !== undefined ? body.voting_closes_at : conf.voting_closes_at,
    body.voting_force_status ?? null,
    conf.id
  ).run()

  const updated = await getConference(c.env.DB)
  return c.json(updated)
})

export default adminConference
