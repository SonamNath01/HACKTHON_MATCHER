"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((state) => state.login)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await api.post('/api/auth/register', { name, email, password })
      login(response.data.token, response.data.user)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Register</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        type="text"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        type="password"
      />
      {error && <p>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </button>
    </div>
  )
}