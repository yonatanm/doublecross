import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

// Restore font preference before first render
if (localStorage.getItem("font") === "frank") {
  document.documentElement.classList.add("font-frank")
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
