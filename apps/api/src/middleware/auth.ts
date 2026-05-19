import { createMiddleware } from 'hono/factory'
import { createClerkClient } from '@clerk/backend'
import type { Bindings, Variables } from '../index.js'

export const requireAuth = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

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

  // Check if admin first
  const admin = await c.env.DB.prepare(
    'SELECT id FROM admin_users WHERE clerk_user_id = ?'
  ).bind(clerkUserId).first<{ id: string }>()

  if (admin) {
    c.set('clerkUserId', clerkUserId)
    c.set('role', 'admin')
    c.set('entityId', admin.id)
    return next()
  }

  // Fall back to voter
  const voter = await c.env.DB.prepare(
    'SELECT id FROM voters WHERE clerk_user_id = ?'
  ).bind(clerkUserId).first<{ id: string }>()

  if (!voter) {
    return c.json({ error: 'User not registered. Call /api/auth/sync first.' }, 403)
  }

  c.set('clerkUserId', clerkUserId)
  c.set('role', 'voter')
  c.set('entityId', voter.id)
  return next()
})

export const requireAdmin = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  if (c.get('role') !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return next()
})
