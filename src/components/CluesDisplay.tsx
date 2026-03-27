import type { NumberedClue } from "@/types/crossword"

interface CluesDisplayProps {
  cluesAcross: NumberedClue[]
  cluesDown: NumberedClue[]
  focusedClueKeys?: Set<string>
}

export default function CluesDisplay({ cluesAcross, cluesDown, focusedClueKeys }: CluesDisplayProps) {
  const renderClueList = (clues: NumberedClue[], orientation: "across" | "down") => (
    <div className="space-y-1.5">
      {clues.map((c) => {
        const isFocused = focusedClueKeys?.has(`${orientation}-${c.number}`) ?? false
        return (
          <div
            key={`${c.number}-${c.clue}`}
            className={`flex gap-2 text-sm leading-relaxed rounded px-1.5 -mx-1.5 transition-colors ${isFocused ? "bg-[#D4E6A5]/50" : ""}`}
          >
            <span className="font-semibold text-muted-foreground min-w-[1.5rem] text-start">
              {c.number}.
            </span>
            <span>
              {c.clue}{" "}
              <span className="text-muted-foreground whitespace-nowrap" dir="ltr">{c.answerLength.replace(/,(?!\s)/g, ", ")}</span>
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-bold mb-3 pb-2 border-b border-border/60" style={{ fontFamily: "var(--font-heading)" }}>
          מאוזן
        </h3>
        {renderClueList(cluesAcross, "across")}
      </div>
      <div>
        <h3 className="text-lg font-bold mb-3 pb-2 border-b border-border/60" style={{ fontFamily: "var(--font-heading)" }}>
          מאונך
        </h3>
        {renderClueList(cluesDown, "down")}
      </div>
    </div>
  )
}
