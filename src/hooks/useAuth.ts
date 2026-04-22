import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User } from "firebase/auth"
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"

// #region agent log
let __authDbgSeq = 0
const __authDbgPost = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
  const body = {
    sessionId: "ae1d53",
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
    runId: "repro",
  }
  // Mirror for DevTools when NDJSON ingest does not reach the workspace (HTTPS→localhost mixed content, etc.)
  console.info("[ae1d53-auth]", body)
  try {
    const key = "__ae1d53_logs"
    const prev = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null
    const arr: unknown[] = prev ? (JSON.parse(prev) as unknown[]) : []
    arr.push(body)
    while (arr.length > 50) arr.shift()
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, JSON.stringify(arr))
  } catch {
    /* quota or private mode */
  }
  fetch("http://127.0.0.1:7535/ingest/6f86fdbf-69ad-4fdc-8a90-92d8169fca78", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ae1d53" },
    body: JSON.stringify(body),
  }).catch(() => {})
}
// #endregion

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
    // #region agent log
    __authDbgPost(
      "useAuth.ts:listener_attach",
      "auth_listener_attached",
      {
        hostname: typeof window !== "undefined" ? window.location.hostname : "",
        protocol: typeof window !== "undefined" ? window.location.protocol : "",
        standalone:
          typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia("(display-mode: standalone)").matches
            : false,
      },
      "H_host_env",
    )
    // #endregion
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const seq = ++__authDbgSeq
      // #region agent log
      __authDbgPost(
        "useAuth.ts:onAuthStateChanged",
        "auth_state_changed",
        {
          seq,
          hostname: typeof window !== "undefined" ? window.location.hostname : "",
          hasUser: !!u,
          msSinceNavStart:
            typeof performance !== "undefined" ? Math.round(performance.now()) : undefined,
        },
        "H_auth_persistence",
      )
      // #endregion
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = useCallback(async () => {
    // #region agent log
    __authDbgPost("useAuth.ts:login", "login_invoked", {}, "H_login_flow")
    // #endregion
    await signInWithPopup(auth, googleProvider)
  }, [])

  const logout = useCallback(async () => {
    // #region agent log
    __authDbgPost("useAuth.ts:logout", "logout_invoked", {}, "H_explicit_signout")
    // #endregion
    await signOut(auth)
  }, [])

  return { user, isLoggedIn: !!user, isAdmin: user?.email === ADMIN_EMAIL, loading, login, logout }
}

export function useAuth() {
  return useContext(AuthContext)
}
