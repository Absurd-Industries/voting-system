import { Hono } from 'hono'
import { createClerkClient } from '@clerk/backend'
import { getClerkUserId } from '../lib/clerk.js'
import type { Bindings, Variables } from '../index.js'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

auth.post('/sync', async (c) => {
  const clerkUserId = await getClerkUserId(c.req.raw, c.env)
  if (!clerkUserId) return c.json({ error: 'Unauthorized' }, 401)

  // Already an admin
  const existingAdmin = await c.env.DB.prepare(
    'SELECT id FROM admin_users WHERE clerk_user_id = ?'
  ).bind(clerkUserId).first<{ id: string }>()
  if (existingAdmin) return c.json({ ok: true, role: 'admin' })

  // Fetch the user's email from Clerk (needed for both voter creation and admin check)
  const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY })
  const user = await clerk.users.getUser(clerkUserId)
  const email = user.emailAddresses[0]?.emailAddress ?? ''

  // Auto-promote to admin if email matches ADMIN_EMAIL env var
  if (c.env.ADMIN_EMAIL && email === c.env.ADMIN_EMAIL) {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO admin_users (id, clerk_user_id, email, created_at) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), clerkUserId, email, Date.now()).run()
    return c.json({ ok: true, role: 'admin' })
  }

  // Register as voter — INSERT OR IGNORE handles concurrent calls safely
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO voters (id, clerk_user_id, email, created_at) VALUES (?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), clerkUserId, email, Date.now()).run()

  return c.json({ ok: true, role: 'voter' })
})

export default auth
