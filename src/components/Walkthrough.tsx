import { useState } from "react"
import {
  LayoutGrid,
  Search,
  Eye,
  Plus,
  TextIcon,
  Link,
  Sparkles,
  GalleryHorizontal,
  Highlighter,
  Printer,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Step {
  icon: LucideIcon
  title: string
  description: string
}

const HOME_STEPS: Step[] = [
  {
    icon: LayoutGrid,
    title: "ברוכים הבאים",
    description: "אחד מאוזן הוא כלי ליצירת תשבצים בעברית. בואו נכיר את הממשק!",
  },
  {
    icon: Search,
    title: "רשימת התשבצים",
    description: "כאן תראו את כל התשבצים שיצרתם. סננו לפי סטטוס או חפשו לפי שם",
  },
  {
    icon: Eye,
    title: "תצוגה מקדימה",
    description: "העבירו את העכבר על תשבץ ברשימה כדי לראות תצוגה מקדימה בצד שמאל",
  },
  {
    icon: Plus,
    title: "יצירת תשבץ חדש",
    description: "לחצו על 'תשבץ חדש' כדי להתחיל ליצור!",
  },
]

const EDITOR_STEPS: Step[] = [
  {
    icon: TextIcon,
    title: "הגדרות",
    description: "כתבו הגדרות בפורמט: תשובה-הגדרה, שורה לכל הגדרה",
  },
  {
    icon: Link,
    title: "מילים מרובות",
    description: "מילה עם רווח (בית ספר) יכולה להתפצל. קו תחתון (בית_ספר) מונע פיצול",
  },
  {
    icon: Sparkles,
    title: "שיבוץ מילים",
    description: "לחצו 'שבץ מילים' ליצירת התשבץ. המערכת תייצר עד 10 הצעות שונות",
  },
  {
    icon: GalleryHorizontal,
    title: "בחירת הצעה",
    description: "גללו בין ההצעות בגלריה, או השתמשו בחיצי מקלדת ימינה/שמאלה",
  },
  {
    icon: Highlighter,
    title: "סימון רמזים",
    description: "לחצו על תא ברשת כדי לסמן רמז — האות תוצג בהדפסה",
  },
  {
    icon: Printer,
    title: "שמירה והדפסה",
    description: "השמירה אוטומטית. לחצו 'הדפס' להדפסת התשבץ",
  },
]

interface WalkthroughProps {
  page: "home" | "editor"
  open: boolean
  onClose: () => void
}

export default function Walkthrough({ page, open, onClose }: WalkthroughProps) {
  const [step, setStep] = useState(0)
  const steps = page === "home" ? HOME_STEPS : EDITOR_STEPS
  const current = steps[step]
  const Icon = current.icon

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      onClose()
      setStep(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {/* Hidden accessible title */}
        <DialogTitle className="sr-only">מדריך שימוש</DialogTitle>

        {/* Step indicator */}
        <div className="text-xs text-muted-foreground text-center">
          שלב {step + 1} מתוך {steps.length}
        </div>

        {/* Icon */}
        <div className="flex justify-center py-2">
          <Icon className="w-12 h-12 text-muted-foreground/50" />
        </div>

        {/* Title */}
        <h3
          className="text-xl font-bold text-center"
          style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
        >
          {current.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {current.description}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-[#C8963E]" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            הקודם
          </Button>
          {step < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              הבא
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                onClose()
                setStep(0)
              }}
            >
              סיום
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
