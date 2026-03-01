import { Pencil, Printer, Archive } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Crossword } from "@/types/crossword"

interface CrosswordCardProps {
  crossword: Crossword
  onEdit: () => void
  onPrint: () => void
  onArchive: () => void
}

const STATUS_MAP: Record<Crossword["status"], { label: string; className: string }> = {
  draft: { label: "טיוטה", className: "bg-secondary text-secondary-foreground" },
  published: { label: "פורסם", className: "bg-emerald-100 text-emerald-800" },
  archived: { label: "בארכיון", className: "bg-red-100 text-red-800" },
}

const DIFFICULTY_MAP: Record<Crossword["difficulty"], string> = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
}

function formatDate(timestamp?: { seconds: number }): string {
  if (!timestamp) return ""
  return new Date(timestamp.seconds * 1000).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default function CrosswordCard({ crossword, onEdit, onPrint, onArchive }: CrosswordCardProps) {
  const status = STATUS_MAP[crossword.status]

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
            {crossword.title || "ללא שם"}
          </CardTitle>
          <div className="flex gap-1.5">
            <Badge className={status.className} variant="secondary">
              {status.label}
            </Badge>
            {crossword.difficulty && (
              <Badge variant="outline" className="text-xs">
                {DIFFICULTY_MAP[crossword.difficulty]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(crossword.createdAt)}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon-xs" onClick={onEdit} title="ערוך">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={onPrint} title="הדפס">
              <Printer className="w-3.5 h-3.5" />
            </Button>
            {crossword.status !== "archived" && (
              <Button variant="ghost" size="icon-xs" onClick={onArchive} title="העבר לארכיון">
                <Archive className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
