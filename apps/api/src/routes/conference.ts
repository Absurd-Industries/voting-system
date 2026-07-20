import { Hono } from 'hono'
import { getConference, getTalksByConference } from '../db/queries.js'
import { getVotingStatus } from '@cfp/db'
import type { Bindings, Variables } from '../index.js'
import { requireAuth } from '../middleware/auth.js'
import { serializePublicTalk } from '../lib/talk-response.js'

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
    speaker_visibility: conf.speaker_visibility,
    server_now: now,
  })
})

// Public archive of submitted talks - powers the landing page for anonymous
// visitors. No auth, no vote counts, and presenter_email stays private.
conference.get('/talks/archive', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured yet' }, 404)

  const { results: talks } = await getTalksByConference(c.env.DB, conf.id)
  // Scramble per request so no talk is disadvantaged by a fixed order -
  // everyone browsing the archive gives every talk equal visibility.
  const archive = [...talks]
  for (let i = archive.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[archive[i], archive[j]] = [archive[j], archive[i]]
  }

  return c.json(archive.map(t => serializePublicTalk(t, conf.speaker_visibility)))
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

  return c.json(orderedTalks.map(t => serializePublicTalk(t, conf.speaker_visibility)))
})

export default conference
