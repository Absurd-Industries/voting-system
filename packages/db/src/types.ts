export interface Conference {
  id: string
  name: string
  description: string | null
  voting_opens_at: number | null
  voting_closes_at: number | null
  voting_force_status: 'open' | 'closed' | 'scheduled'
  votes_per_voter: number
  results_public: 0 | 1
  created_at: number
}

export interface SlotType {
  id: string
  conference_id: string
  duration_minutes: number
  count: number
}

export interface Talk {
  id: string
  conference_id: string
  title: string
  description: string | null
  duration_minutes: number
  presenter_name: string
  presenter_bio: string | null
  presenter_email: string | null
  created_at: number
}

export interface Voter {
  id: string
  clerk_user_id: string
  email: string
  created_at: number
}

export interface AdminUser {
  id: string
  clerk_user_id: string
  email: string
  created_at: number
}

export interface Vote {
  id: string
  voter_id: string
  talk_id: string
  cast_at: number
}

export interface AuditLog {
  id: string
  admin_user_id: string
  action: string
  target_type: string
  target_id: string | null
  details: string | null
  created_at: number
}
