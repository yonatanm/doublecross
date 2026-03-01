import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import CrosswordCard from "@/components/CrosswordCard"
import { useCrosswords, useArchiveCrossword } from "@/hooks/useCrosswords"
import { useAuth } from "@/hooks/useAuth"
import { openPrintWindow } from "@/lib/print-crossword"
import type { Crossword } from "@/types/crossword"

type StatusFilter = "all" | "draft" | "published" | "archived"

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "draft", label: "טיוטות" },
  { key: "published", label: "פורסמו" },
  { key: "archived", label: "ארכיון" },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, login } = useAuth()
  const { data: crosswords, isLoading } = useCrosswords()
  const archiveMutation = useArchiveCrossword()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mb-6">
          <span className="text-4xl" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>א</span>
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
          אחד מאוזן
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          בונה תשבצים חכם — צרו תשבצים, הגדירו רמזים, והדפיסו בקלות
        </p>
        <Button onClick={login} size="lg" className="gap-2">
          התחבר כדי להתחיל
        </Button>
      </div>
    )
  }

  const filtered = (crosswords || []).filter((cw: Crossword) => {
    if (statusFilter !== "all" && cw.status !== statusFilter) return false
    if (searchQuery && !cw.title?.includes(searchQuery)) return false
    return true
  })

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
          התשבצים שלי
        </h1>
        <Button onClick={() => navigate("/editor")} className="gap-2">
          <Plus className="w-4 h-4" />
          תשבץ חדש
        </Button>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <Badge
              key={f.key}
              variant={statusFilter === f.key ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "לא נמצאו תוצאות" : "עדיין אין תשבצים"}
          </p>
          {!searchQuery && (
            <Button variant="outline" onClick={() => navigate("/editor")} className="gap-2">
              <Plus className="w-4 h-4" />
              צרו את התשבץ הראשון
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cw: Crossword) => (
            <CrosswordCard
              key={cw.id}
              crossword={cw}
              onEdit={() => navigate(`/editor?id=${cw.id}`)}
              onPrint={() => openPrintWindow(cw)}
              onArchive={() => cw.id && archiveMutation.mutate(cw.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
