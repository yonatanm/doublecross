import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { AuthContext, useAuthProvider } from "@/hooks/useAuth"
import Header from "@/components/Header"
import HomePage from "@/pages/HomePage"
import EditorPage from "@/pages/EditorPage"
import SolvePage from "@/pages/SolvePage"
import VersionPage from "@/pages/VersionPage"

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
                <div className="min-h-screen bg-background">
                  <Header />
                  <main className="max-w-6xl mx-auto px-6 py-6">
                    <Routes>
                      <Route path="/" element={<SolveRedirect />} />
                      <Route path="/editor" element={<EditorPage />} />
                      <Route path="/version" element={<VersionPage />} />
                    </Routes>
                  </main>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
