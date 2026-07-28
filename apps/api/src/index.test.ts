import { describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(),
}))

import app from './index.js'

const configuredOrigins =
  'https://devroom.absurd.industries,https://cfp-voting.pages.dev'

describe('CORS', () => {
  it.each([
    'https://devroom.absurd.industries',
    'https://cfp-voting.pages.dev',
  ])('allows configured production origin %s', async origin => {
    const response = await app.request(
      '/api/health',
      {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      },
      { ALLOWED_ORIGIN: configuredOrigins } as never,
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
  })
})
