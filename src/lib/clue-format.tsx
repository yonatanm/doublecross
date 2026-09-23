import type { ReactNode } from "react"

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function walkHtml(node: Node, key: { i: number }): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(c => walkHtml(c, key))
  if (tag === 'b') return <strong key={key.i++}>{children}</strong>
  if (tag === 'u') return <u key={key.i++}>{children}</u>
  return children.length === 1 ? children[0] : children.filter(Boolean)
}

/** Parse whitelisted HTML (<b>/<u>) into React nodes for display. */
export function renderClueHtml(html: string): ReactNode {
  if (!html) return null
  const key = { i: 0 }
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const children = Array.from(doc.body.childNodes).map(c => walkHtml(c, key)).filter((c): c is ReactNode => c !== null)
  return children.length === 1 ? children[0] : children
}

function walkPrint(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '')
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(walkPrint).join('')
  if (tag === 'b') return `<b>${children}</b>`
  if (tag === 'u') return `<u>${children}</u>`
  return children
}

/** Convert whitelisted HTML to an escaped HTML string for print output. */
export function clueHtmlToPrintHtml(html: string): string {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return Array.from(doc.body.childNodes).map(walkPrint).join('')
}

/** Remove <b>/<u> tags from a string (e.g. for search matching). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}
