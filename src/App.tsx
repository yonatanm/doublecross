import { BrowserRouter, Routes, Route, Navigate, useSearchParams, Link } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { AuthContext, useAuthProvider } from "@/hooks/useAuth"
import Header from "@/components/Header"
import HomePage from "@/pages/HomePage"
import EditorPage from "@/pages/EditorPage"
import SolvePage from "@/pages/SolvePage"
import VersionPage from "@/pages/VersionPage"
import AboutPage from "@/pages/AboutPage"
import TermsPage from "@/pages/TermsPage"
import PrivacyPage from "@/pages/PrivacyPage"

/** Redirect ?solve=ID to /solve/ID (so share URLs use root path for 200 status). */
function SolveRedirect() {
  const [params] = useSearchParams()
  const solveId = params.get("solve")
  if (solveId) return <Navigate to={`/solve/${solveId}`} replace />
  return <HomePage />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

export default function App() {
  const authValue = useAuthProvider()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Toaster dir="rtl" position="top-center" richColors />
        <BrowserRouter basename="/doublecross/">
          <Routes>
            {/* Solve page has its own minimal header */}
            <Route path="/solve/:id" element={<SolvePage />} />

            {/* All other pages use the standard layout */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-background flex flex-col">
                  <Header />
                  <main className="max-w-6xl mx-auto px-6 py-6 flex-1 w-full">
                    <Routes>
                      <Route path="/" element={<SolveRedirect />} />
                      <Route path="/editor" element={<EditorPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/version" element={<VersionPage />} />
                    </Routes>
                  </main>
                  <footer className="text-center text-sm text-muted-foreground py-4 space-y-2">
                    <nav className="flex justify-center gap-4">
                      <Link to="/about" className="hover:underline">אודות</Link>
                      <Link to="/terms" className="hover:underline">תנאי שימוש</Link>
                      <Link to="/privacy" className="hover:underline">פרטיות</Link>
                    </nav>
                    <p>© 2026 כל הזכויות שמורות ליונתן ממן</p>
                  </footer>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
