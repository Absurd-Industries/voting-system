import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.js'
import ErrorBoundary from './components/ErrorBoundary.js'
import './index.css'

const queryClient = new QueryClient()

const DEV_NO_AUTH = import.meta.env.VITE_DEV_NO_AUTH === 'true'

const tree = (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
)

// ClerkProvider throws on an empty key, so in dev-no-auth mode we skip it
// entirely. The auth switch in lib/auth.tsx supplies stubbed hooks instead.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {DEV_NO_AUTH ? (
      tree
    ) : (
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        {tree}
      </ClerkProvider>
    )}
  </React.StrictMode>
)
