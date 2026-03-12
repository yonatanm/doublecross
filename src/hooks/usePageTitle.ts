import { useEffect } from "react"

const BASE_TITLE = "אחד מאוזן - בונה תשבצים"

export function usePageTitle(subtitle?: string) {
  useEffect(() => {
    document.title = subtitle ? `${subtitle} | אחד מאוזן` : BASE_TITLE
    return () => { document.title = BASE_TITLE }
  }, [subtitle])
}
