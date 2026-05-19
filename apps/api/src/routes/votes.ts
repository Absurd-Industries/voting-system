import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { getConference, getVoterVotes } from '../db/queries.js'
import { getVotingStatus } from '@cfp/db'
import type { Bindings, Variables } from '../index.js'

const votes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

votes.use('*', requireAuth)

votes.get('/mine', async (c) => {
  if (c.get('role') === 'admin') {
    return c.json({ votes: [], votes_per_voter: 0 })
  }
  const voterId = c.get('entityId')
  const { results } = await getVoterVotes(c.env.DB, voterId)
  const conf = await getConference(c.env.DB)
  return c.json({
    votes: results.map(v => v.talk_id),
    votes_per_voter: conf?.votes_per_voter ?? 0,
  })
})

votes.post('/:talkId', async (c) => {
  if (c.get('role') === 'admin') {
    return c.json({ error: 'Admins cannot vote' }, 403)
  }

  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  if (conf.votes_per_voter === 0) {
    return c.json({ error: 'Voting is not open yet — no slots configured' }, 403)
  }

  const status = getVotingStatus(conf)
  if (status === 'closed') {
    return c.json({
      error: 'Voting is closed',
      voting_opens_at: conf.voting_opens_at,
      voting_closes_at: conf.voting_closes_at,
    }, 403)
  }

  const talkId = c.req.param('talkId')
  const talk = await c.env.DB.prepare(
    'SELECT id FROM talks WHERE id = ? AND conference_id = ?'
  ).bind(talkId, conf.id).first<{ id: string }>()
  if (!talk) return c.json({ error: 'Talk not found' }, 404)

  const voterId = c.get('entityId')

  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO votes (id, voter_id, talk_id, cast_at)
      SELECT ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM votes WHERE voter_id = ?) < (
        SELECT votes_per_voter FROM conferences LIMIT 1
      )
    `).bind(crypto.randomUUID(), voterId, talkId, Date.now(), voterId).run()

    if (result.meta.changes === 0) {
      return c.json({ error: `Vote budget exhausted (${conf.votes_per_voter} votes max)` }, 422)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      return c.json({ error: 'Already voted for this talk' }, 409)
    }
    throw e
  }

  return c.json({ ok: true })
})

votes.delete('/:talkId', async (c) => {
  if (c.get('role') === 'admin') {
    return c.json({ error: 'Admins cannot vote' }, 403)
  }

  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const status = getVotingStatus(conf)
  if (status === 'closed') {
    return c.json({ error: 'Voting is closed — cannot retract votes' }, 403)
  }

  const talkId = c.req.param('talkId')
  const voterId = c.get('entityId')

  const result = await c.env.DB.prepare(
    'DELETE FROM votes WHERE voter_id = ? AND talk_id = ?'
  ).bind(voterId, talkId).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Vote not found' }, 404)
  }

  return c.json({ ok: true })
})

export default votes
