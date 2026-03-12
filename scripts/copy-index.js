import { cpSync, mkdirSync, copyFileSync } from "fs"

const routes = ["about", "terms", "privacy", "editor", "version"]

for (const route of routes) {
  mkdirSync(`dist/${route}`, { recursive: true })
  copyFileSync("dist/index.html", `dist/${route}/index.html`)
}

// 404.html fallback for unknown routes (e.g. /solve/:id)
copyFileSync("dist/index.html", "dist/404.html")
