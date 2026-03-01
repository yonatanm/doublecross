import { Link, useLocation } from "react-router-dom"
import { LayoutGrid, LogIn, LogOut, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"

export default function Header() {
  const { user, isLoggedIn, login, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" || location.pathname === "" : location.pathname.startsWith(path)

  return (
    <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Right side: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={import.meta.env.BASE_URL + "cw.png"} alt="לוגו" className="w-9 h-9 rounded" />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>
              אחד מאוזן
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/">
              <Button
                variant={isActive("/") && !isActive("/editor") ? "secondary" : "ghost"}
                size="sm"
                className="gap-2 text-sm"
              >
                <LayoutGrid className="w-4 h-4" />
                התשבצים שלי
              </Button>
            </Link>
          </nav>
        </div>

        {/* Left side: Help + Auth */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => window.dispatchEvent(new CustomEvent("open-walkthrough"))}
            title="עזרה"
          >
            <HelpCircle className="w-4 h-4" />
            עזרה
          </Button>
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-secondary text-xs font-medium">
                    {user?.displayName?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user?.displayName}
                </span>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={logout} title="התנתק">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={login} className="gap-2">
              <LogIn className="w-4 h-4" />
              התחבר עם Google
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
