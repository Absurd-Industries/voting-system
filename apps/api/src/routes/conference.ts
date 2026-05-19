import { Hono } from 'hono'
import { getConference, getTalksByConference } from '../db/queries.js'
import { getVotingStatus } from '@cfp/db'
import type { Bindings, Variables } from '../index.js'

const conference = new Hono<{ Bindings: Bindings; Variables: Variables }>()

conference.get('/conference', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured yet' }, 404)

  const status = getVotingStatus(conf)
  return c.json({
    id: conf.id,
    name: conf.name,
    description: conf.description,
    voting_opens_at: conf.voting_opens_at,
    voting_closes_at: conf.voting_closes_at,
    voting_status: status,
    votes_per_voter: conf.votes_per_voter,
  })
})

conference.get('/talks', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured yet' }, 404)

  const { results: talks } = await getTalksByConference(c.env.DB, conf.id)
  return c.json(talks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    duration_minutes: t.duration_minutes,
    presenter_name: t.presenter_name,
    presenter_bio: t.presenter_bio,
  })))
  // Note: presenter_email is intentionally excluded from the public response
})

export default conference
