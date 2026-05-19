// The Vite proxy forwards /api/* to localhost:8787 in dev.
// In production, set VITE_API_URL to the Worker URL.
const BASE = import.meta.env.VITE_API_URL ?? ''

async function getToken(): Promise<string | null> {
  try {
    const clerk = (window as unknown as { __clerk?: { session?: { getToken: () => Promise<string> } } }).__clerk
    return (await clerk?.session?.getToken()) ?? null
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  // Handle CSV download (non-JSON)
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('text/csv')) return res.blob() as unknown as T
  return res.json() as Promise<T>
}
