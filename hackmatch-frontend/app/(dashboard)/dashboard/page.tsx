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
    return <div>Loading...</div>
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div>
      <nav>
        <Link href="/dashboard">HackMatch</Link>
        <div>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ fontWeight: pathname === href ? "bold" : "normal" }}
            >
              {label}
            </Link>
          ))}
        </div>
        <div>
          <span>{user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  )
}