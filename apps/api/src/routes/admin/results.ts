import { Hono } from 'hono'
import { getConference, getTalksWithVoteCounts } from '../../db/queries.js'
import type { Bindings, Variables } from '../../index.js'

const adminResults = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminResults.get('/', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const { results: talks } = await getTalksWithVoteCounts(c.env.DB, conf.id)

  // Group by duration_minutes
  const grouped: Record<number, typeof talks> = {}
  for (const talk of talks) {
    if (!grouped[talk.duration_minutes]) grouped[talk.duration_minutes] = []
    grouped[talk.duration_minutes].push(talk)
  }

  const byDuration = Object.entries(grouped)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([duration, talkList]) => ({
      duration_minutes: Number(duration),
      talks: talkList,
    }))

  return c.json({ by_duration: byDuration })
})

adminResults.get('/export', async (c) => {
  const conf = await getConference(c.env.DB)
  if (!conf) return c.json({ error: 'No conference configured' }, 404)

  const { results: talks } = await getTalksWithVoteCounts(c.env.DB, conf.id)

  const header = 'title,duration_minutes,presenter_name,vote_count'
  const csvRows = talks.map(t =>
    [
      `"${t.title.replace(/"/g, '""')}"`,
      t.duration_minutes,
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
