import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Trash2, Pencil, Archive } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import CrosswordGrid from "@/components/CrosswordGrid"
import GuidedTour from "@/components/GuidedTour"
import { useCrosswords } from "@/hooks/useCrosswords"
import { useAuth } from "@/hooks/useAuth"
import { useWalkthrough } from "@/hooks/useWalkthrough"
import { usePageTitle } from "@/hooks/usePageTitle"
import { getArchivedCrosswords, deleteCrosswordsByIds, archiveCrossword } from "@/lib/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Crossword } from "@/types/crossword"

type StatusFilter = "all" | "draft" | "published" | "archived" | "geek"

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "draft", label: "טיוטות" },
  { key: "published", label: "מוכנים" },
  { key: "archived", label: "ארכיון" },
  { key: "geek", label: "geek.co.il" },
]

const STATUS_LABELS: Record<Crossword["status"], string> = {
  draft: "טיוטה",
  published: "מוכן",
  archived: "ארכיון",
}

function formatDate(timestamp?: { seconds: number }): string {
  if (!timestamp) return ""
  const d = new Date(timestamp.seconds * 1000)
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + " " + d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, isAdmin, login } = useAuth()
  const { data: crosswords, isLoading, error, refetch } = useCrosswords()
  const walkthrough = useWalkthrough("home")
  usePageTitle("התשבצים שלי")

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [archivedItems, setArchivedItems] = useState<Crossword[]>([])
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <img src={import.meta.env.BASE_URL + "cw.png"} alt="לוגו" className="w-20 h-20 rounded-2xl mb-6" />
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-heading)" }}>
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

  const allItems = crosswords || []
  const nonGeek = allItems.filter((cw) => !cw.source || (cw.source === "geek" && cw.status === "archived"))
  const statusCounts: Record<StatusFilter, number> = {
    all: nonGeek.length,
    draft: nonGeek.filter((cw) => cw.status === "draft").length,
    published: nonGeek.filter((cw) => cw.status === "published").length,
    archived: nonGeek.filter((cw) => cw.status === "archived").length,
    geek: allItems.filter((cw) => cw.source === "geek" && cw.status !== "archived").length,
  }

  const filtered = (crosswords || []).filter((cw: Crossword) => {
    const isGeek = cw.source === "geek" && cw.status !== "archived"
    if (statusFilter === "geek") { if (!isGeek) return false }
    else { if (isGeek) return false }
    if (statusFilter !== "all" && statusFilter !== "geek" && cw.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery
      const inMeta = cw.title?.includes(q) || cw.topic?.includes(q) || cw.description?.includes(q)
      const inClues = cw.raw_clues?.some((rc) => rc.answer.includes(q) || rc.clue.includes(q))
      if (!inMeta && !inClues) return false
    }
    return true
  })

  const selected = filtered.find((cw) => cw.id === selectedId) || filtered[0] || null

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (!filtered.length) return
    const currentIdx = filtered.findIndex((cw) => cw.id === selectedId)

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.min(currentIdx + 1, filtered.length - 1)
      setSelectedId(filtered[next].id || null)
      listRef.current?.querySelectorAll("[data-cw-id]")[next]?.scrollIntoView({ block: "nearest" })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = Math.max(currentIdx - 1, 0)
      setSelectedId(filtered[prev].id || null)
      listRef.current?.querySelectorAll("[data-cw-id]")[prev]?.scrollIntoView({ block: "nearest" })
    } else if (e.key === "Enter" && selectedId) {
      e.preventDefault()
      navigate(`/editor?id=${selectedId}`)
    }
  }

  return (
    <div>
      <GuidedTour page="home" open={walkthrough.isOpen} onClose={walkthrough.close} />
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          התשבצים שלי
        </h1>
        <div className="flex gap-2">
          {import.meta.env.DEV && (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={async () => {
                  const items = await getArchivedCrosswords(isAdmin)
                  if (items.length === 0) {
                    toast("אין תשבצים בארכיון")
                    return
                  }
                  setArchivedItems(items)
                  setSelectedForDeletion(new Set(items.map((c) => c.id!)))
                  setArchiveDialogOpen(true)
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                מחק ארכיון
              </Button>
            </>
          )}
          <Button onClick={() => navigate("/editor")} className="gap-2" data-tour="new-crossword">
            <Plus className="w-4 h-4" />
            תשבץ חדש
          </Button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <Badge
              key={f.key}
              variant={statusFilter === f.key ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label} ({statusCounts[f.key]})
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
      {error ? (
        <div className="text-center py-16 text-destructive text-sm">
          שגיאה בטעינת התשבצים: {(error as Error).message}
        </div>
      ) : isLoading ? (
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
        <div className="grid grid-cols-[420px_1fr] gap-4">
          {/* Right: List */}
          <div className="border rounded-lg overflow-hidden" data-tour="crossword-list">
            {/* List header */}
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b text-xs text-muted-foreground font-medium">
              <span>שם</span>
              <span>עדכון אחרון</span>
            </div>
            {/* List items */}
            <div
              ref={listRef}
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              className="divide-y max-h-[calc(100vh-280px)] overflow-y-auto outline-none focus:ring-2 focus:ring-[#C8963E]/30 rounded-b-lg"
            >
              {filtered.map((cw: Crossword) => (
                <div
                  key={cw.id}
                  data-cw-id={cw.id}
                  className={[
                    "px-4 py-3 cursor-pointer transition-colors",
                    selected?.id === cw.id ? "bg-secondary" : "hover:bg-secondary/30",
                  ].join(" ")}
                  onClick={() => { setSelectedId(cw.id || null); listRef.current?.focus() }}
                  onDoubleClick={() => navigate(`/editor?id=${cw.id}`)}
                >
                  {/* Line 1: avatar, title, status, date, actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar size="sm" title={cw.userDisplayName || cw.userEmail || ""}>
                        <AvatarImage src={cw.userPhotoURL} alt="" />
                        <AvatarFallback>{(cw.userEmail || "?")[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {cw.title || "ללא שם"}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        {STATUS_LABELS[cw.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(cw.updatedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => { e.stopPropagation(); navigate(`/editor?id=${cw.id}`) }}
                        title="עריכה"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      {cw.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await archiveCrossword(cw.id!)
                            refetch()
                          }}
                          title="העבר לארכיון"
                        >
                          <Archive className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Line 2: topic tag + description */}
                  {(cw.topic || cw.description) && (
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      {cw.topic && (
                        <Badge className="text-[10px] px-2 py-0 shrink-0 rounded-full bg-[#C8963E]/15 text-[#96700E] border-[#C8963E]/30 hover:bg-[#C8963E]/15">
                          {cw.topic}
                        </Badge>
                      )}
                      {cw.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {cw.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Left: Preview */}
          <div className="bg-card border rounded-lg p-6 flex flex-col items-center min-h-[400px]" data-tour="preview">
            {selected?.grid && selected.layout_result ? (
              <>
                <h2
                  className="text-xl font-bold mb-4"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {selected.title}
                </h2>
                <CrosswordGrid
                  grid={selected.grid}
                  cols={selected.layout_cols || selected.grid[0]?.length || 0}
                  rows={selected.layout_rows || selected.grid.length}
                  layoutResult={selected.layout_result}
                  highlightedCells={selected.highlighted_cells || []}
                  onCellClick={() => {}}
                  interactive={true}
                  showLetters={false}
                  cellSize={22}
                  showNumbers={false}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                בחרו תשבץ מהרשימה
              </div>
            )}
          </div>
        </div>
      )}
      {/* Delete archived confirmation dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת תשבצים מהארכיון</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            סמנו את התשבצים שברצונכם למחוק:
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {archivedItems.map((cw) => (
              <label key={cw.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedForDeletion.has(cw.id!)}
                  onChange={(e) => {
                    const next = new Set(selectedForDeletion)
                    if (e.target.checked) next.add(cw.id!)
                    else next.delete(cw.id!)
                    setSelectedForDeletion(next)
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm truncate">{cw.title || cw.id}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              disabled={selectedForDeletion.size === 0}
              onClick={async () => {
                const count = await deleteCrosswordsByIds([...selectedForDeletion])
                toast(`נמחקו ${count} תשבצים`)
                setArchiveDialogOpen(false)
                refetch()
              }}
            >
              מחק {selectedForDeletion.size} תשבצים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
