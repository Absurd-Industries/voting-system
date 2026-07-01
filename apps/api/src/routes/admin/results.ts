import { Hono } from 'hono'
import { getConference, getTalksWithVoteCounts, getVoteStats } from '../../db/queries.js'
import { logAdminAction } from '../../lib/audit.js'
import type { Bindings, Variables } from '../../index.js'

const adminResults = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminResults.get('/', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const { results: talks } = await getTalksWithVoteCounts(c.env.DB, conf.id)
  const stats = await getVoteStats(c.env.DB, conf.id)

  return c.json({
    talks,
    results_public: conf.results_public === 1,
    stats,
    method: {
      type: 'approval',
      votes_per_voter: conf.votes_per_voter,
      notes: 'Voters may select up to the vote budget. Unused votes are allowed. Ties share the same vote total and can be resolved by organizer scheduling judgment.',
    },
  })
})

adminResults.put('/publication', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const body = await c.req.json<{ results_public: boolean }>()

  await c.env.DB.prepare(
    'UPDATE conferences SET results_public = ? WHERE id = ?'
  ).bind(body.results_public ? 1 : 0, conf.id).run()

  await logAdminAction(c.env.DB, c.get('entityId'), 'update_publication', 'results', conf.id, {
    results_public: body.results_public,
  })

  return c.json({ ok: true, results_public: body.results_public })
})

adminResults.get('/export', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const { results: talks } = await getTalksWithVoteCounts(c.env.DB, conf.id)

  const header = 'title,presenter_name,vote_count'
  const csvRows = talks.map(t =>
    [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.presenter_name.replace(/"/g, '""')}"`,
      t.vote_count,
    ].join(',')
  )

  const csv = [header, ...csvRows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="results.csv"',
    },
  })
})

export default adminResults
