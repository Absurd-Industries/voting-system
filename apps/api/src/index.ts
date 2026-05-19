import { Hono } from 'hono'
import { cors } from 'hono/cors'

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

export default app
