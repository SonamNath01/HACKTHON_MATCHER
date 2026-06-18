"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { AxiosError } from "axios"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"
import { Team, MatchResult } from "@/types"

export default function TeamDetailPage() {
  const { id } = useParams() as { id: string }
  const { user } = useAuthStore()

  const [team, setTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamRes = await api.get(`/api/teams/${id}`)
        const fetchedTeam: Team = teamRes.data.team

        setTeam(fetchedTeam)

        // Only fetch matches if logged in user is the leader
        if (fetchedTeam.leaderId === user?.id) {
          const matchesRes = await api.get(`/api/teams/${id}/matches`)
          setMatches(matchesRes.data.matches || [])
        }
      } catch {
        setError("Failed to load team.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user?.id])

  const handleInvite = async () => {
    setInviting(true)
    setInviteMessage("")
    try {
      await api.post(`/api/teams/${id}/invite`, { email: inviteEmail })
      setInviteMessage("Invite sent successfully.")
      setInviteEmail("")
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>
      setInviteMessage(error.response?.data?.message || "Failed to send invite.")
    } finally {
      setInviting(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!team) return <div>Team not found.</div>

  const isLeader = team.leaderId === user?.id

  return (
    <div>
      <h1>{team.name}</h1>
      <p>{team.description}</p>
      <p>Hackathon: {team.hackathon?.name}</p>
      <p>Status: {team.status}</p>
      <p>Members: {team.members?.length ?? 0} / {team.maxSize}</p>

      <div>
        <h2>Required Skills</h2>
        {team.requiredSkills?.map((rs) => (
          <span key={rs.skillId}>{rs.skill?.name}</span>
        ))}
      </div>

      <div>
        <h2>Team Members</h2>
        {team.members?.map((member) => (
          <div key={member.id}>
            <p>{member.user?.name}</p>
            <p>{member.user?.email}</p>
          </div>
        ))}
      </div>

      {isLeader && (
        <div>
          <h2>Invite Someone</h2>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="candidate@email.com"
          />
          <button onClick={handleInvite} disabled={!inviteEmail || inviting}>
            {inviting ? "Sending..." : "Send Invite"}
          </button>
          {inviteMessage && <p>{inviteMessage}</p>}
        </div>
      )}

      {isLeader && matches.length > 0 && (
        <div>
          <h2>Top Candidates</h2>
          {matches.map((match) => (
            <div key={match.candidate.id}>
              <p>{match.candidate.name}</p>
              <p>{match.candidate.email}</p>
              <p>Score: {match.score}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
