// app/(dashboard)/teams/[id]/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"
import { Team, Match, MatchResult } from "@/types"

type TeamWithMatches = Team & {
  matches?: Match[]
}

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
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const [responding, setResponding] = useState(false)
  const [pendingInvite, setPendingInvite] = useState<Match | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamRes = await api.get(`/api/teams/${id}`)
        const fetchedTeam: TeamWithMatches = teamRes.data.team
        setTeam(fetchedTeam)
        setPendingInvite(
          fetchedTeam.matches?.find(
            (match) => match.receiverId === user?.id && match.status === "PENDING"
          ) ?? null
        )

        if (fetchedTeam.leaderId === user?.id) {
          const matchesRes = await api.get(`/api/teams/${id}/matches`)
          setMatches(matchesRes.data.matches || [])
        }
      } catch (err) {
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
    setInviteSuccess(false)
    try {
      await api.post(`/api/teams/${id}/invite`, { email: inviteEmail })
      setInviteMessage("Invite sent successfully.")
      setInviteSuccess(true)
      setInviteEmail("")
    } catch (err: any) {
      setInviteMessage(err.response?.data?.message || "Failed to send invite.")
      setInviteSuccess(false)
    } finally {
      setInviting(false)
    }
  }

  const handleRespond = async (matchId: string, status: "ACCEPTED" | "REJECTED") => {
    setResponding(true)
    try {
      await api.patch(`/api/matches/${matchId}/respond`, { status })
      const teamRes = await api.get(`/api/teams/${id}`)
      setTeam(teamRes.data.team)
      setPendingInvite(null)
    } catch (err) {
      setError("Failed to respond to invite.")
    } finally {
      setResponding(false)
    }
  }

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading team...</div>
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
  if (!team) {
    return <div className="p-10 text-sm text-muted-foreground">Team not found.</div>
  }

  const isLeader = team.leaderId === user?.id

  return (
    <div className="p-8 sm:p-10 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <h1 className="font-heading text-2xl font-bold tracking-tight">{team.name}</h1>
          <span className="text-xs font-medium rounded-full px-2.5 py-0.5 border text-accent bg-accent/10 border-accent/30">
            {team.status}
          </span>
        </div>
        {team.description && (
          <p className="text-sm text-muted-foreground mt-2">{team.description}</p>
        )}
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span>{team.hackathon?.name}</span>
          <span>{team.members?.length ?? 0} / {team.maxSize} members</span>
        </div>
      </div>

      {/* Required skills */}
      {team.requiredSkills && team.requiredSkills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Required skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {team.requiredSkills.map((rs) => (
              <span
                key={rs.skillId}
                className="text-xs bg-card border border-border/60 rounded-full px-3 py-1"
              >
                {rs.skill?.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Members */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
          Team members
        </h2>
        <div className="flex flex-col gap-2">
          {team.members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 bg-card border border-border/60 rounded-md px-4 py-3"
            >
              <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
                {member.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-medium">{member.user?.name}</p>
                <p className="text-xs text-muted-foreground">{member.user?.email}</p>
              </div>
              {team.leaderId === member.userId && (
                <span className="ml-auto text-xs text-accent font-medium">Leader</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pending invite — accept/reject */}
      {pendingInvite && (
        <section className="mb-8">
          <div className="border border-accent/30 bg-accent/10 rounded-lg p-5">
            <h2 className="text-sm font-medium mb-1">You have a pending invite</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Compatibility score:{" "}
              <span className="text-accent font-medium">{pendingInvite.score} / 100</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRespond(pendingInvite.id, "ACCEPTED")}
                disabled={responding}
                className="flex-1 bg-accent text-accent-foreground text-sm font-medium rounded-md py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Accept
              </button>
              <button
                onClick={() => handleRespond(pendingInvite.id, "REJECTED")}
                disabled={responding}
                className="flex-1 border border-border text-sm rounded-md py-2 hover:border-destructive/50 hover:text-destructive transition-colors disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Leader — invite by email */}
      {isLeader && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Invite someone
          </h2>
          <div className="bg-card border border-border/60 rounded-lg p-5">
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inviteEmail && !inviting && handleInvite()}
                placeholder="candidate@email.com"
                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
              <button
                onClick={handleInvite}
                disabled={!inviteEmail || inviting}
                className="bg-accent text-accent-foreground text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {inviting ? "Sending..." : "Send"}
              </button>
            </div>
            {inviteMessage && (
              <p className={`text-xs mt-3 ${inviteSuccess ? "text-accent" : "text-destructive"}`}>
                {inviteMessage}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Leader — top candidates */}
      {isLeader && matches.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Top candidates
          </h2>
          <div className="flex flex-col gap-2">
            {matches.map((match) => (
              <div
                key={match.candidate.id}
                className="flex items-center justify-between bg-card border border-border/60 rounded-md px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {match.candidate.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm">{match.candidate.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-accent font-medium">{match.score} / 100</div>
                    <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${match.score}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setInviteEmail(match.candidate.email || "")}
                    className="text-xs border border-border rounded-md px-3 py-1 hover:border-accent hover:text-accent transition-colors"
                  >
                    Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
