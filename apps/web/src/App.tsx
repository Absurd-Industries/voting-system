import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { SignIn, UserButton, useAuth } from './lib/auth.js'
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
    <Link to={to} className={`nav-link shrink-0 ${active ? 'nav-link-active' : ''}`}>
      {label}
    </Link>
  )
}

/** Shell placeholder while Clerk boots, so protected routes never flash blank. */
function AppShellLoading() {
  return (
    <div className="min-h-screen text-ink">
      <nav className="sticky top-0 z-40 border-b border-ink/10 bg-kraft/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <i className="ph-bold ph-cpu text-lg text-ink" aria-hidden="true" />
          <span className="hidden font-serif text-base font-bold text-ink sm:inline">Hardware Devroom</span>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6" role="status" aria-label="Loading">
        <div className="skeleton h-32 w-full" />
        <div className="skeleton mt-6 h-16 w-full" />
      </main>
    </div>
  )
}

function AuthenticatedApp() {
  const { isSignedIn, isLoaded } = useAuth()
  const location = useLocation()

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      await apiFetch('/api/auth/sync', { method: 'POST' })
      return apiFetch<CurrentUser>('/api/auth/me')
    },
    enabled: isLoaded && isSignedIn,
    retry: 1,
  })

  if (!isLoaded) return <AppShellLoading />

  if (!isSignedIn) {
    // Return the visitor to the page they were trying to reach (e.g. /vote)
    // instead of Clerk's default landing target.
    const returnTo = location.pathname + location.search
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <SignIn routing="hash" forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo} />
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
            <Link
              to="/"
              className="group flex shrink-0 items-center gap-2 font-serif text-base font-bold text-ink"
              aria-label="Hardware Devroom home"
            >
              <i className="ph-bold ph-cpu text-lg text-ink transition-colors group-hover:text-stamp" aria-hidden="true" />
              <span className="hidden sm:inline">Hardware Devroom</span>
            </Link>
            <div className="scrollbar-hide flex min-w-0 gap-0.5 overflow-x-auto">
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
  const { getToken } = useAuth()
  const location = useLocation()

  // Keep the token getter current for every apiFetch (public pages included);
  // must run before any React Query queryFn fires.
  initApiAuth(getToken)

  // Public pages paint immediately - they must not wait on Clerk's remote
  // script, otherwise every visitor gets a blank page while it loads.
  if (location.pathname === '/') return <LandingPage />
  if (location.pathname === '/results') return <PublicResultsPage />

  return <AuthenticatedApp />
}
