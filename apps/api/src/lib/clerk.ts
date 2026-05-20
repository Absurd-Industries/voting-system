import { createClerkClient } from '@clerk/backend'
import type { Bindings } from '../index.js'

// Returns the Clerk user ID from the request, or null if unauthenticated.
// Uses authenticateRequest — Clerk's officially recommended method for Workers.
export async function getClerkUserId(
  request: Request,
  env: Pick<Bindings, 'CLERK_SECRET_KEY' | 'CLERK_PUBLISHABLE_KEY' | 'ALLOWED_ORIGIN'>
): Promise<string | null> {
  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  })

  try {
    const state = await clerk.authenticateRequest(request, {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      authorizedParties: [env.ALLOWED_ORIGIN],
    })

    if (!state.isSignedIn) return null
    return state.toAuth().userId
  } catch {
    return null
  }
}
