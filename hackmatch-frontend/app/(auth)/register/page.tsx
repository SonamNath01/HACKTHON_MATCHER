"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((state) => state.login)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await api.post("/api/auth/register", { name, email, password })
      login(response.data.token, response.data.user)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = name.trim() && email.trim() && password.length >= 6 && !loading

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-heading font-bold text-lg tracking-tight hover:text-accent transition-colors">
            HackMatch
          </Link>
          <h1 className="font-heading text-2xl font-bold tracking-tight mt-6">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Start matching with hackathon teams.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg shadow-black/20">
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Full name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              type="text"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@dev.io"
              type="email"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
            />
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Password
              <span className="text-muted-foreground/60"> — min 6 characters</span>
            </label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                className="w-full bg-background border border-border rounded-md px-3 py-2 pr-9 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground font-medium text-sm rounded-md py-2.5 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading && (
              <span className="size-3.5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" />
            )}
            {loading ? "Creating account..." : "Create account"}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:opacity-80 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}