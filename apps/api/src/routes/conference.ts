import { Hono } from 'hono'
import { getConference, getTalksByConference } from '../db/queries.js'
import { getVotingStatus } from '@cfp/db'
import type { Bindings, Variables } from '../index.js'
import { requireAuth } from '../middleware/auth.js'

const conference = new Hono<{ Bindings: Bindings; Variables: Variables }>()

conference.get('/conference', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured yet' }, 404)

  const status = getVotingStatus(conf)
  const now = Date.now()
  return c.json({
    id: conf.id,
    name: conf.name,
    description: conf.description,
    voting_opens_at: conf.voting_opens_at,
    voting_closes_at: conf.voting_closes_at,
    voting_status: status,
    votes_per_voter: conf.votes_per_voter,
    results_public: conf.results_public === 1,
    server_now: now,
  })
})

function stableHash(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

conference.get('/talks', requireAuth, async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured yet' }, 404)

  const { results: talks } = await getTalksByConference(c.env.DB, conf.id)
  const entityId = c.get('entityId')
  const orderedTalks = c.get('role') === 'voter'
    ? [...talks].sort((a, b) => stableHash(`${entityId}:${a.id}`) - stableHash(`${entityId}:${b.id}`))
    : talks

  return c.json(orderedTalks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    presenter_name: t.presenter_name,
    presenter_bio: t.presenter_bio,
  })))
  // Note: presenter_email is intentionally excluded from the public response
})

export default conference
