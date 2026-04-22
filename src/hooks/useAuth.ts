import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User } from "firebase/auth"
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"

// Must match the email in Firestore security rules isAdmin().
// This is a UI-only gate; actual authorization is enforced by Firestore rules.
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ""

export interface AuthContextValue {
  user: User | null
  isLoggedIn: boolean
  isAdmin: boolean
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  return { user, isLoggedIn: !!user, isAdmin: user?.email === ADMIN_EMAIL, loading, login, logout }
}

export function useAuth() {
  return useContext(AuthContext)
}
