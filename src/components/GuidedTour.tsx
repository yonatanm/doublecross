import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
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
import { Button } from "@/components/ui/button"

interface TourStep {
  targetSelector: string | null
  side: "top" | "bottom" | "left" | "right"
  icon: LucideIcon
  title: string
  description: string
}

const HOME_STEPS: TourStep[] = [
  {
    targetSelector: null,
    side: "bottom",
    icon: LayoutGrid,
    title: "ברוכים הבאים",
    description: "אחד מאוזן הוא כלי ליצירת תשבצים בעברית. בואו נכיר את הממשק!",
  },
  {
    targetSelector: '[data-tour="crossword-list"]',
    side: "left",
    icon: Search,
    title: "רשימת התשבצים",
    description: "כאן תראו את כל התשבצים שיצרתם. סננו לפי סטטוס או חפשו לפי שם",
  },
  {
    targetSelector: '[data-tour="preview"]',
    side: "right",
    icon: Eye,
    title: "תצוגה מקדימה",
    description: "העבירו את העכבר על תשבץ ברשימה כדי לראות תצוגה מקדימה בצד שמאל",
  },
  {
    targetSelector: '[data-tour="new-crossword"]',
    side: "bottom",
    icon: Plus,
    title: "יצירת תשבץ חדש",
    description: "לחצו על 'תשבץ חדש' כדי להתחיל ליצור!",
  },
]

const EDITOR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="clues-textarea"]',
    side: "left",
    icon: TextIcon,
    title: "הגדרות",
    description: "כתבו הגדרות בפורמט: תשובה-הגדרה, שורה לכל הגדרה",
  },
  {
    targetSelector: '[data-tour="clues-textarea"]',
    side: "left",
    icon: Link,
    title: "מילים מרובות",
    description: "מילה עם רווח (בית ספר) יכולה להתפצל. קו תחתון (בית_ספר) מונע פיצול",
  },
  {
    targetSelector: '[data-tour="generate-btn"]',
    side: "top",
    icon: Sparkles,
    title: "שיבוץ מילים",
    description: "לחצו 'שבץ מילים' ליצירת התשבץ. המערכת תייצר עד 10 הצעות שונות",
  },
  {
    targetSelector: '[data-tour="proposal-gallery"]',
    side: "top",
    icon: GalleryHorizontal,
    title: "בחירת הצעה",
    description: "גללו בין ההצעות בגלריה, או השתמשו בחיצי מקלדת ימינה/שמאלה",
  },
  {
    targetSelector: '[data-tour="crossword-grid"]',
    side: "left",
    icon: Highlighter,
    title: "סימון רמזים",
    description: "לחצו על תא ברשת כדי לסמן רמז — האות תוצג בהדפסה",
  },
  {
    targetSelector: '[data-tour="print-area"]',
    side: "bottom",
    icon: Printer,
    title: "שמירה והדפסה",
    description: "השמירה אוטומטית. לחצו 'הדפס' להדפסת התשבץ",
  },
]

interface GuidedTourProps {
  page: "home" | "editor"
  open: boolean
  onClose: () => void
}

const SPOTLIGHT_PADDING = 8
const TOOLTIP_GAP = 16
const TOOLTIP_MAX_WIDTH = 320
const ARROW_SIZE = 8

export default function GuidedTour({ page, open, onClose }: GuidedTourProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPlacement, setTooltipPlacement] = useState<{
    top: number
    left: number
    actualSide: "top" | "bottom" | "left" | "right"
  } | null>(null)

  const allSteps = page === "home" ? HOME_STEPS : EDITOR_STEPS
  // Filter out steps whose target element doesn't exist in the DOM
  const steps = allSteps.filter(
    (s) => !s.targetSelector || document.querySelector(s.targetSelector)
  )
  const current = steps[step] ?? steps[0]

  // Reset step when closing
  useEffect(() => {
    if (!open) setStep(0)
  }, [open])

  // Measure target element on step change
  const measureTarget = useCallback(() => {
    if (!open) return
    const sel = steps[step]?.targetSelector
    if (!sel) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(sel)
    if (!el) {
      setTargetRect(null)
      return
    }
    setTargetRect(el.getBoundingClientRect())
  }, [open, step, steps])

  useEffect(() => {
    if (!open) return

    const sel = steps[step]?.targetSelector
    if (sel) {
      const el = document.querySelector(sel)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" })
        // Delay measurement to after scroll settles
        const timer = setTimeout(measureTarget, 100)
        return () => clearTimeout(timer)
      }
    }
    measureTarget()
  }, [open, step, steps, measureTarget])

  // Update rect on scroll/resize
  useEffect(() => {
    if (!open) return

    const handleUpdate = () => measureTarget()
    window.addEventListener("scroll", handleUpdate, true)
    window.addEventListener("resize", handleUpdate)

    const observer = new ResizeObserver(handleUpdate)
    observer.observe(document.documentElement)

    return () => {
      window.removeEventListener("scroll", handleUpdate, true)
      window.removeEventListener("resize", handleUpdate)
      observer.disconnect()
    }
  }, [open, measureTarget])

  // Compute tooltip position after render
  useEffect(() => {
    if (!open || !current) return
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    if (!targetRect) {
      // Centered
      const tw = Math.min(TOOLTIP_MAX_WIDTH, vw - 32)
      const th = tooltip.offsetHeight
      setTooltipPlacement({
        top: Math.max(16, (vh - th) / 2),
        left: Math.max(16, (vw - tw) / 2),
        actualSide: "bottom",
      })
      return
    }

    const tw = tooltip.offsetWidth
    const th = tooltip.offsetHeight
    const preferredSide = current.side

    const computePosition = (side: "top" | "bottom" | "left" | "right") => {
      let top = 0
      let left = 0

      switch (side) {
        case "bottom":
          top = targetRect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP
          left = targetRect.left + targetRect.width / 2 - tw / 2
          break
        case "top":
          top = targetRect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP - th
          left = targetRect.left + targetRect.width / 2 - tw / 2
          break
        case "left":
          top = targetRect.top + targetRect.height / 2 - th / 2
          left = targetRect.left - SPOTLIGHT_PADDING - TOOLTIP_GAP - tw
          break
        case "right":
          top = targetRect.top + targetRect.height / 2 - th / 2
          left = targetRect.right + SPOTLIGHT_PADDING + TOOLTIP_GAP
          break
      }

      return { top, left }
    }

    const fitsInViewport = (pos: { top: number; left: number }) => {
      return (
        pos.top >= 8 &&
        pos.left >= 8 &&
        pos.top + th <= vh - 8 &&
        pos.left + tw <= vw - 8
      )
    }

    // Try preferred side, then flip, then perpendicular sides
    const flipMap: Record<string, string> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    }
    const sides: ("top" | "bottom" | "left" | "right")[] = [
      preferredSide,
      flipMap[preferredSide] as "top" | "bottom" | "left" | "right",
      ...((["top", "bottom", "left", "right"] as const).filter(
        (s) => s !== preferredSide && s !== flipMap[preferredSide]
      )),
    ]

    let bestSide = preferredSide
    let bestPos = computePosition(preferredSide)

    for (const side of sides) {
      const pos = computePosition(side)
      if (fitsInViewport(pos)) {
        bestSide = side
        bestPos = pos
        break
      }
    }

    // Clamp to viewport
    bestPos.top = Math.max(8, Math.min(bestPos.top, vh - th - 8))
    bestPos.left = Math.max(8, Math.min(bestPos.left, vw - tw - 8))

    setTooltipPlacement({
      top: bestPos.top,
      left: bestPos.left,
      actualSide: bestSide,
    })
  }, [open, targetRect, current?.side, step])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowLeft") {
        setStep((s) => Math.min(steps.length - 1, s + 1))
      } else if (e.key === "ArrowRight") {
        setStep((s) => Math.max(0, s - 1))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, steps.length, onClose])

  if (!open || !current) return null

  const Icon = current.icon

  // Spotlight cutout dimensions
  const spotlightX = targetRect ? targetRect.left - SPOTLIGHT_PADDING : 0
  const spotlightY = targetRect ? targetRect.top - SPOTLIGHT_PADDING : 0
  const spotlightW = targetRect ? targetRect.width + SPOTLIGHT_PADDING * 2 : 0
  const spotlightH = targetRect ? targetRect.height + SPOTLIGHT_PADDING * 2 : 0

  // Arrow style based on actual placement side
  const arrowStyle = (side: "top" | "bottom" | "left" | "right") => {
    const base: React.CSSProperties = {
      position: "absolute",
      width: 0,
      height: 0,
      borderStyle: "solid",
    }
    switch (side) {
      case "bottom": // tooltip is below target, arrow points up
        return {
          ...base,
          top: -ARROW_SIZE,
          left: "50%",
          marginLeft: -ARROW_SIZE,
          borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px`,
          borderColor: "transparent transparent white transparent",
        } as React.CSSProperties
      case "top": // tooltip is above target, arrow points down
        return {
          ...base,
          bottom: -ARROW_SIZE,
          left: "50%",
          marginLeft: -ARROW_SIZE,
          borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0 ${ARROW_SIZE}px`,
          borderColor: "white transparent transparent transparent",
        } as React.CSSProperties
      case "left": // tooltip is left of target, arrow points right
        return {
          ...base,
          top: "50%",
          right: -ARROW_SIZE,
          marginTop: -ARROW_SIZE,
          borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
          borderColor: "transparent transparent transparent white",
        } as React.CSSProperties
      case "right": // tooltip is right of target, arrow points left
        return {
          ...base,
          top: "50%",
          left: -ARROW_SIZE,
          marginTop: -ARROW_SIZE,
          borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
          borderColor: "transparent white transparent transparent",
        } as React.CSSProperties
    }
  }

  // Clamp arrow position when tooltip is clamped to viewport edge
  const getArrowOverride = (): React.CSSProperties => {
    if (!targetRect || !tooltipPlacement) return {}
    const side = tooltipPlacement.actualSide
    if (side === "top" || side === "bottom") {
      const targetCenterX = targetRect.left + targetRect.width / 2
      const tooltipLeft = tooltipPlacement.left
      const tooltipEl = tooltipRef.current
      const tw = tooltipEl?.offsetWidth ?? TOOLTIP_MAX_WIDTH
      const arrowLeft = targetCenterX - tooltipLeft
      const clamped = Math.max(ARROW_SIZE + 8, Math.min(arrowLeft, tw - ARROW_SIZE - 8))
      return { left: clamped, marginLeft: -ARROW_SIZE }
    }
    if (side === "left" || side === "right") {
      const targetCenterY = targetRect.top + targetRect.height / 2
      const tooltipTop = tooltipPlacement.top
      const tooltipEl = tooltipRef.current
      const th = tooltipEl?.offsetHeight ?? 200
      const arrowTop = targetCenterY - tooltipTop
      const clamped = Math.max(ARROW_SIZE + 8, Math.min(arrowTop, th - ARROW_SIZE - 8))
      return { top: clamped, marginTop: -ARROW_SIZE }
    }
    return {}
  }

  return createPortal(
    <>
      {/* SVG overlay with spotlight cutout */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx="8"
                ry="8"
                fill="black"
                style={{ transition: "all 0.3s ease" }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Click-blocking overlay (transparent, behind tooltip) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
        }}
        onClick={onClose}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        dir="rtl"
        style={{
          position: "fixed",
          zIndex: 51,
          maxWidth: TOOLTIP_MAX_WIDTH,
          top: tooltipPlacement?.top ?? -9999,
          left: tooltipPlacement?.left ?? -9999,
          transition: "top 0.3s ease, left 0.3s ease",
          visibility: tooltipPlacement ? "visible" : "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-xl shadow-xl border p-4 space-y-3">
          {/* Step indicator */}
          <div className="text-xs text-muted-foreground text-center">
            שלב {step + 1} מתוך {steps.length}
          </div>

          {/* Icon */}
          <div className="flex justify-center py-1">
            <Icon className="w-10 h-10 text-muted-foreground/50" />
          </div>

          {/* Title */}
          <h3
            className="text-lg font-bold text-center"
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
              <Button size="sm" onClick={onClose}>
                סיום
              </Button>
            )}
          </div>
        </div>

        {/* Arrow */}
        {targetRect && tooltipPlacement && (
          <div
            style={{
              ...arrowStyle(tooltipPlacement.actualSide),
              ...getArrowOverride(),
            }}
          />
        )}
      </div>
    </>,
    document.body
  )
}
