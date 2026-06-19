"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((state) => state.login)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await api.post("/api/auth/login", { email, password })
      login(response.data.token, response.data.user)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email.trim() && password.length > 0 && !loading

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-heading font-bold text-lg tracking-tight">
            HackMatch
          </Link>
          <h1 className="font-heading text-2xl font-bold tracking-tight mt-6">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to find your next team.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
              placeholder="jane@dev.io"
              type="email"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
              placeholder="••••••••"
              type="password"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>

          {error && (
            <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-accent text-accent-foreground font-medium text-sm rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          No account yet?{" "}
          <Link href="/register" className="text-accent hover:opacity-80 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}