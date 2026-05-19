import { Hono } from 'hono'
import { createClerkClient } from '@clerk/backend'
import type { Bindings, Variables } from '../index.js'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

auth.post('/sync', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const clerk = createClerkClient({
    secretKey: c.env.CLERK_SECRET_KEY,
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
  })

  let clerkUserId: string
  try {
    const verified = await clerk.verifyToken(token)
    clerkUserId = verified.sub
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  // Check if admin
  const existingAdmin = await c.env.DB.prepare(
    'SELECT id FROM admin_users WHERE clerk_user_id = ?'
  ).bind(clerkUserId).first<{ id: string }>()
  if (existingAdmin) return c.json({ ok: true, role: 'admin' })

  // Check if voter already registered
  const existingVoter = await c.env.DB.prepare(
    'SELECT id FROM voters WHERE clerk_user_id = ?'
  ).bind(clerkUserId).first<{ id: string }>()
  if (existingVoter) return c.json({ ok: true, role: 'voter' })

  // New user — fetch email from Clerk and create voter row
  const user = await clerk.users.getUser(clerkUserId)
  const email = user.emailAddresses[0]?.emailAddress ?? ''
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO voters (id, clerk_user_id, email, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, clerkUserId, email, Date.now()).run()

  return c.json({ ok: true, role: 'voter' })
})

export default auth
