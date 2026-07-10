import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { SignIn, ClerkLoaded, UserButton, useAuth } from './lib/auth.js'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiFetch, initApiAuth } from './lib/api.js'
import LandingPage from './pages/LandingPage.js'
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

function NavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link to={to} className={`nav-link ${active ? 'nav-link-active' : ''}`}>
      {label}
    </Link>
  )
}

function AuthenticatedApp() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const location = useLocation()

  // Store getToken callback synchronously so apiFetch always has it
  // before any React Query queryFns fire
  initApiAuth(getToken)

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      await apiFetch('/api/auth/sync', { method: 'POST' })
      return apiFetch<CurrentUser>('/api/auth/me')
    },
    enabled: isLoaded && isSignedIn,
    retry: 1,
  })

  // Standalone public pages (no app shell)
  if (location.pathname === '/') {
    return <LandingPage />
  }
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
  const { pathname } = location

  function adminOnly(element: ReactNode) {
    if (isUserLoading) {
      return <div className="py-4 text-sm text-ink-faint">Loading…</div>
    }
    if (!isAdmin) return <ForbiddenPage />
    return element
  }

  return (
    <div className="min-h-screen text-ink">
      <nav className="sticky top-0 z-40 border-b border-ink/10 bg-kraft/85 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="group flex shrink-0 items-center gap-2 font-serif text-base font-bold text-ink">
              <i className="ph-bold ph-cpu text-ink transition-colors group-hover:text-stamp" aria-hidden="true" /> Hardware Devroom
            </Link>
            <div className="flex gap-0.5 overflow-x-auto">
              <NavItem to="/vote" label="Vote" active={pathname === '/vote'} />
              {isAdmin && (
                <>
                  <NavItem to="/admin/conference" label="Conference" active={pathname === '/admin/conference'} />
                  <NavItem to="/admin/talks" label="Talks" active={pathname === '/admin/talks'} />
                  <NavItem to="/admin/results" label="Results" active={pathname === '/admin/results'} />
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && <span className="tag tag-muted hidden sm:inline-flex">{currentUser.role}</span>}
            <UserButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/vote" element={<VotePage />} />
          <Route path="/admin/conference" element={adminOnly(<ConferencePage />)} />
          <Route path="/admin/talks" element={adminOnly(<TalksPage />)} />
          <Route path="/admin/results" element={adminOnly(<ResultsPage />)} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

function ForbiddenPage() {
  return (
    <div className="max-w-xl">
      <p className="supertitle">Forbidden</p>
      <h1 className="page-title mt-2">Admin access required</h1>
      <p className="mt-3 text-sm leading-6 text-ink-light">
        This page is only available to conference admins. Use the vote page for voter access.
      </p>
      <Link to="/vote" className="btn-ink mt-5">
        Go to vote page
      </Link>
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
