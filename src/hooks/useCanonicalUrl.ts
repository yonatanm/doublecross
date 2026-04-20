import { useEffect } from "react"

const BASE_URL = "https://tashbetzim.co.il"

/**
 * Update <link rel="canonical"> to reflect the current page.
 * Pass the path (e.g. "/about/"). Falls back to root if omitted.
 */
export function useCanonicalUrl(path: string = "/") {
  useEffect(() => {
    const href = `${BASE_URL}${path}`
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement("link")
      link.rel = "canonical"
      document.head.appendChild(link)
    }
    link.href = href
  }, [path])
}
