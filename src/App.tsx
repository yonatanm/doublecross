import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthContext, useAuthProvider } from "@/hooks/useAuth"
import Header from "@/components/Header"
import HomePage from "@/pages/HomePage"
import EditorPage from "@/pages/EditorPage"

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
        <BrowserRouter basename="/doublecross/">
          <div className="min-h-screen bg-background">
            <Header />
            <main className="max-w-6xl mx-auto px-6 py-6">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/editor" element={<EditorPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
