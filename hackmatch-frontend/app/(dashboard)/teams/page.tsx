"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import api from "@/lib/axios"
import { Team } from "@/types"

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get("/api/teams")
        const openTeams = (res.data.teams || []).filter((t: Team) => t.status === "FORMING")
        setTeams(openTeams)
      } catch {
        setError("Failed to load teams.")
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading teams...</div>
  }
  if (error) {
    return (
      <div className="p-10">
        <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 sm:p-10 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Discover teams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {teams.length} open team{teams.length !== 1 ? "s" : ""} forming right now
          </p>
        </div>
        <Link
          href="/teams/create"
          className="text-sm font-medium bg-accent text-accent-foreground rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
        >
          + Create team
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="border border-border/60 rounded-lg px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No open teams right now.
          </p>
          <Link
            href="/teams/create"
            className="text-sm font-medium border border-border rounded-md px-4 py-2 inline-block hover:border-accent hover:text-accent transition-colors"
          >
            Create your own team
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="block bg-card border border-border/60 hover:border-accent/50 rounded-lg p-5 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-medium text-sm">{team.name}</h2>
                <span className="text-xs font-medium rounded-full px-2.5 py-0.5 border text-accent bg-accent/10 border-accent/30">
                  {team.status}
                </span>
              </div>

              {team.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {team.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{team.hackathon?.name || "No hackathon"}</span>
                <span>{team.members?.length ?? 0} / {team.maxSize} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}