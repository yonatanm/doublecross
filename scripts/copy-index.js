import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs"

const BASE_URL = "https://tashbetzim.co.il"

// Routes that should have their own canonical URL baked into the HTML
// (so non-JS crawlers see the correct canonical)
const seoRoutes = ["about", "terms", "privacy"]
// Routes that just need an index.html copy for client-side routing
const otherRoutes = ["editor", "version"]

const rootHtml = readFileSync("dist/index.html", "utf-8")

function rewriteCanonical(html, path) {
  const canonical = `${BASE_URL}${path}`
  return html.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${canonical}">`,
  )
}

for (const route of seoRoutes) {
  mkdirSync(`dist/${route}`, { recursive: true })
  writeFileSync(`dist/${route}/index.html`, rewriteCanonical(rootHtml, `/${route}/`))
}

for (const route of otherRoutes) {
  mkdirSync(`dist/${route}`, { recursive: true })
  copyFileSync("dist/index.html", `dist/${route}/index.html`)
}

// 404.html fallback for unknown routes (e.g. /solve/:id)
copyFileSync("dist/index.html", "dist/404.html")
