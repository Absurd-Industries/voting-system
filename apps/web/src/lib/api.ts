const BASE = import.meta.env.VITE_API_URL ?? ''

let _getToken: (() => Promise<string | null>) | null = null

export function initApiAuth(getToken: () => Promise<string | null>) {
  _getToken = getToken
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = _getToken ? await _getToken() : null
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) ?? {}),
  }
  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('text/csv')) return res.blob() as unknown as T
  return res.json() as Promise<T>
}
