"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/stores/authStore"

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/teams", label: "Teams" },
  { href: "/teams/create", label: "Create Team" },
  { href: "/profile", label: "Profile" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, logout, initialize } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initialize()
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push("/login")
    }
  }, [ready, isAuthenticated])

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="size-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="flex-1 flex flex-col">
      <nav className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center gap-4 sm:gap-6">
        <Link
          href="/dashboard"
          className="font-heading font-bold text-lg tracking-tight shrink-0 hover:text-accent transition-colors"
        >
          HackMatch
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto flex-1 [scrollbar-width:none]">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`relative shrink-0 text-sm rounded-md px-3 py-1.5 transition-colors ${
                  isActive
                    ? "text-foreground font-medium bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="size-7 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </span>
            <span className="text-sm text-muted-foreground max-w-[10rem] truncate">
              {user?.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium border border-border rounded-md px-3 py-1.5 hover:border-destructive/50 hover:text-destructive transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
