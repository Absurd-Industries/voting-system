import type { Conference, SlotType, Talk, Vote } from '@cfp/db'

export async function getConference(db: D1Database) {
  return db.prepare('SELECT * FROM conferences LIMIT 1').first<Conference>()
}

export async function getTalksByConference(db: D1Database, conferenceId: string) {
  return db.prepare(
    'SELECT * FROM talks WHERE conference_id = ? ORDER BY created_at DESC'
  ).bind(conferenceId).all<Talk>()
}

export async function getTalksWithVoteCounts(db: D1Database, conferenceId: string) {
  return db.prepare(`
    SELECT t.*, COUNT(v.id) as vote_count
    FROM talks t
    LEFT JOIN votes v ON v.talk_id = t.id
    WHERE t.conference_id = ?
    GROUP BY t.id
    ORDER BY vote_count DESC, t.created_at DESC
  `).bind(conferenceId).all<Talk & { vote_count: number }>()
}

export async function getSlotTypes(db: D1Database, conferenceId: string) {
  return db.prepare(
    'SELECT * FROM slot_types WHERE conference_id = ? ORDER BY duration_minutes'
  ).bind(conferenceId).all<SlotType>()
}

export async function getVoterVotes(db: D1Database, voterId: string) {
  return db.prepare(
    'SELECT * FROM votes WHERE voter_id = ?'
  ).bind(voterId).all<Vote>()
}

export async function getVoteCount(db: D1Database, voterId: string) {
  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM votes WHERE voter_id = ?'
  ).bind(voterId).first<{ count: number }>()
  return result?.count ?? 0
}
