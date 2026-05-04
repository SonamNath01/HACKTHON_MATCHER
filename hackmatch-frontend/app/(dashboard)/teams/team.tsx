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
        const openTeams = res.data.filter((t: Team) => t.status === "FORMING")
        setTeams(openTeams)
      } catch {
        setError("Failed to load teams.")
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  return (
    <div>
      <h1>Discover Teams</h1>
      <p>{teams.length} open teams found</p>

      {teams.length === 0 ? (
        <div>
          <p>No open teams right now.</p>
          <Link href="/teams/create">Create your own -&gt;</Link>
        </div>
      ) : (
        <div>
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <div>
                <h2>{team.name}</h2>
                <p>{team.description}</p>
                <p>{team.hackathon?.name}</p>
                <p>{team.members?.length ?? 0} / {team.maxSize} members</p>
                <p>{team.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
