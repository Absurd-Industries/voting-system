// Auth switch: re-exports real Clerk primitives, or dev stubs when
// VITE_DEV_NO_AUTH === 'true'. The flag is constant for the app's lifetime,
// so hook identity is stable across renders (no rules-of-hooks violation).
// When stubbed, the app runs with no Clerk keys and the user is signed in.
import {
  useAuth as clerkUseAuth,
  ClerkLoaded as ClerkClerkLoaded,
  SignIn as ClerkSignIn,
  UserButton as ClerkUserButton,
} from '@clerk/react'
import type { ReactNode } from 'react'

const DEV_NO_AUTH = import.meta.env.VITE_DEV_NO_AUTH === 'true'

const devUseAuth = () => ({
  isSignedIn: true,
  isLoaded: true,
  getToken: async (): Promise<string | null> => 'dev-token',
})

const DevPassthrough = ({ children }: { children?: ReactNode }) => <>{children}</>
const DevNull = () => null

export const useAuth = (DEV_NO_AUTH ? devUseAuth : clerkUseAuth) as typeof clerkUseAuth
export const ClerkLoaded = (DEV_NO_AUTH ? DevPassthrough : ClerkClerkLoaded) as typeof ClerkClerkLoaded
export const SignIn = (DEV_NO_AUTH ? DevNull : ClerkSignIn) as typeof ClerkSignIn
export const UserButton = (DEV_NO_AUTH ? DevNull : ClerkUserButton) as typeof ClerkUserButton
