import type { NumberedClue } from "@/types/crossword"

interface CluesDisplayProps {
  cluesAcross: NumberedClue[]
  cluesDown: NumberedClue[]
}

export default function CluesDisplay({ cluesAcross, cluesDown }: CluesDisplayProps) {
  const renderClueList = (clues: NumberedClue[]) => (
    <div className="space-y-1.5">
      {clues.map((c) => (
        <div key={`${c.number}-${c.clue}`} className="flex gap-2 text-sm leading-relaxed">
          <span className="font-semibold text-muted-foreground min-w-[1.5rem] text-start">
            {c.number}.
          </span>
          <span>
            {c.clue}{" "}
            <span className="text-muted-foreground">{c.answerLength}</span>
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-bold mb-3 pb-2 border-b border-border/60" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
          מאוזן
        </h3>
        {renderClueList(cluesAcross)}
      </div>
      <div>
        <h3 className="text-lg font-bold mb-3 pb-2 border-b border-border/60" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
          מאונך
        </h3>
        {renderClueList(cluesDown)}
      </div>
    </div>
  )
}
