"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/axios"
import { Hackathon, Skill } from "@/types"

export default function CreateTeamPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [hackathonId, setHackathonId] = useState("")
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])

  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [skills, setSkills] = useState<Skill[]>([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hackathonsRes, skillsRes] = await Promise.all([
          api.get("/api/hackathons"),
          api.get("/api/skills"),
        ])
        setHackathons(hackathonsRes.data)
        setSkills(skillsRes.data)
      } catch (err) {
        setError("Failed to load form data.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const toggleSkill = (skillId: string) => {
    setRequiredSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    try {
      await api.post("/api/teams", {
        name,
        description,
        hackathonId,
        requiredSkills,
      })
      router.push("/teams")
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create team.")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = name.trim() && hackathonId && !submitting

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="p-8 sm:p-10 max-w-xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Create a team
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your team and start matching with candidates.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-5">
        {error && (
          <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Team name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pixel Pioneers"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you building?"
            rows={3}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Hackathon <span className="text-destructive">*</span>
          </label>
          <select
            value={hackathonId}
            onChange={(e) => setHackathonId(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          >
            <option value="">Select a hackathon</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Required skills
            <span className="text-muted-foreground/60 ml-1">— optional</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => {
              const selected = requiredSkills.includes(skill.id)
              return (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                    selected
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "bg-background border-border text-muted-foreground hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  {skill.name}
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-accent text-accent-foreground font-medium text-sm rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          {submitting ? "Creating..." : "Create team"}
        </button>
      </div>
    </div>
  )
}