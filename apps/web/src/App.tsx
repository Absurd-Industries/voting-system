import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { SignIn, ClerkLoaded, UserButton, useAuth } from '@clerk/react'
import { useEffect } from 'react'
import { apiFetch } from './lib/api.js'
import VotePage from './pages/VotePage.js'
import ConferencePage from './pages/admin/ConferencePage.js'
import TalksPage from './pages/admin/TalksPage.js'
import ResultsPage from './pages/admin/ResultsPage.js'

function SyncUser() {
  const { isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (!isSignedIn) return
    getToken().then(token => {
      if (token) apiFetch('/api/auth/sync', { method: 'POST' }).catch(() => null)
    })
  }, [isSignedIn, getToken])

  return null
}

function AuthenticatedApp() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignIn routing="hash" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SyncUser />
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex gap-4">
          <Link to="/" className="font-medium text-gray-700 hover:text-black">Vote</Link>
          <Link to="/admin/conference" className="font-medium text-gray-700 hover:text-black">Conference</Link>
          <Link to="/admin/talks" className="font-medium text-gray-700 hover:text-black">Talks</Link>
          <Link to="/admin/results" className="font-medium text-gray-700 hover:text-black">Results</Link>
        </div>
        <UserButton />
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<VotePage />} />
          <Route path="/admin/conference" element={<ConferencePage />} />
          <Route path="/admin/talks" element={<TalksPage />} />
          <Route path="/admin/results" element={<ResultsPage />} />
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
