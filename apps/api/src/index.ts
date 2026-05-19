import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/auth.js'
import conferenceRoutes from './routes/conference.js'
import voteRoutes from './routes/votes.js'
import { requireAuth, requireAdmin } from './middleware/auth.js'
import adminConferenceRoutes from './routes/admin/conference.js'
import adminSlotTypesRoutes from './routes/admin/slot-types.js'
import adminTalksRoutes from './routes/admin/talks.js'
import adminResultsRoutes from './routes/admin/results.js'

export type Bindings = {
  DB: D1Database
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  ALLOWED_ORIGIN: string
}

export type Variables = {
  clerkUserId: string
  role: 'voter' | 'admin'
  entityId: string
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('*', async (c, next) => {
  const handler = cors({ origin: c.env.ALLOWED_ORIGIN, credentials: true })
  return handler(c, next)
})

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/auth', authRoutes)
app.route('/api', conferenceRoutes)
app.route('/api/votes', voteRoutes)

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>()
admin.use('*', requireAuth, requireAdmin)
admin.route('/conference', adminConferenceRoutes)
admin.route('/slot-types', adminSlotTypesRoutes)
admin.route('/talks', adminTalksRoutes)
admin.route('/results', adminResultsRoutes)
app.route('/api/admin', admin)

export default app
