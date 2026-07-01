import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { SignIn, ClerkLoaded, UserButton, useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, initApiAuth } from './lib/api.js'
import VotePage from './pages/VotePage.js'
import ConferencePage from './pages/admin/ConferencePage.js'
import TalksPage from './pages/admin/TalksPage.js'
import ResultsPage from './pages/admin/ResultsPage.js'
import PublicResultsPage from './pages/PublicResultsPage.js'

interface CurrentUser {
  role: 'voter' | 'admin'
  id: string
  email: string
}

function AuthenticatedApp() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const location = useLocation()

  // Store getToken callback synchronously so apiFetch always has it
  // before any React Query queryFns fire
  initApiAuth(getToken)

  const { data: currentUser } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      await apiFetch('/api/auth/sync', { method: 'POST' })
      return apiFetch<CurrentUser>('/api/auth/me')
    },
    enabled: isLoaded && isSignedIn,
    retry: 1,
  })

  if (location.pathname === '/results') {
    return <PublicResultsPage />
  }

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignIn routing="hash" />
      </div>
    )
  }

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/40 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/" className="shrink-0 text-sm font-semibold text-slate-950">CFP Voting</Link>
            <div className="flex gap-1 overflow-x-auto">
              <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">Vote</Link>
              {isAdmin && (
                <>
                  <Link to="/admin/conference" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">Conference</Link>
                  <Link to="/admin/talks" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">Talks</Link>
                  <Link to="/admin/results" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">Results</Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
                {currentUser.role}
              </span>
            )}
            <UserButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<VotePage />} />
          <Route path="/admin/conference" element={<ConferencePage />} />
          <Route path="/admin/talks" element={<TalksPage />} />
          <Route path="/admin/results" element={<ResultsPage />} />
          <Route path="/results" element={<PublicResultsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ClerkLoaded>
      <AuthenticatedApp />
    </ClerkLoaded>
  )
}
