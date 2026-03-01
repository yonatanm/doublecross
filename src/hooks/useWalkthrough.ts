import { useState, useEffect, useCallback } from "react"

function storageKey(page: string) {
  return `walkthrough:${page}:dismissedAt`
}

function shouldShow(page: string): boolean {
  const raw = localStorage.getItem(storageKey(page))
  if (!raw) return true
  const dismissedAt = new Date(raw).getTime()
  if (isNaN(dismissedAt)) return true
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return Date.now() - dismissedAt > thirtyDays
}

export function useWalkthrough(page: "home" | "editor") {
  const [isOpen, setIsOpen] = useState(() => shouldShow(page))

  const open = useCallback(() => setIsOpen(true), [])

  const close = useCallback(() => {
    setIsOpen(false)
    localStorage.setItem(storageKey(page), new Date().toISOString())
  }, [page])

  // Listen for "open-walkthrough" custom event from Header help button
  useEffect(() => {
    const handler = () => open()
    window.addEventListener("open-walkthrough", handler)
    return () => window.removeEventListener("open-walkthrough", handler)
  }, [open])

  return { isOpen, open, close }
}
