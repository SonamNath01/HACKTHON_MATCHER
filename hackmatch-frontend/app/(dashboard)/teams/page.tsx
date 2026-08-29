"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import api from "@/lib/axios"
import { TeamMatchResult, User } from "@/types"
import { ScoreBreakdownBars, buildWhyThisMatch } from "@/components/score-breakdown"

type SortBy = "match" | "capacity"

export default function TeamsPage() {
  const [results, setResults] = useState<TeamMatchResult[]>([])
  const [myProfile, setMyProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [hackathonFilter, setHackathonFilter] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("match")

  const [confirmTeamId, setConfirmTeamId] = useState("")
  const [requestingTeamId, setRequestingTeamId] = useState("")

  const fetchTeams = async () => {
    const res = await api.get("/api/matches/teams")
    setResults(res.data.teams || [])
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [, profileRes] = await Promise.all([fetchTeams(), api.get("/api/auth/me")])
        setMyProfile(profileRes.data.user || profileRes.data)
      } catch {
        setError("Failed to load teams.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sendJoinRequest = async (teamId: string) => {
    setRequestingTeamId(teamId)
    try {
      await api.post(`/api/teams/${teamId}/request-join`)
      toast.success("Join request sent.")
      setConfirmTeamId("")
      await fetchTeams()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send join request.")
      // The team may have just filled up, or a request may already exist —
      // pull the real current state rather than trusting what's on screen.
      await fetchTeams()
    } finally {
      setRequestingTeamId("")
    }
  }

  const hackathons = useMemo(() => {
    const seen = new Map<string, string>()
    results.forEach((r) => {
      if (r.team.hackathon) seen.set(r.team.hackathonId, r.team.hackathon.name)
    })
    return Array.from(seen.entries())
  }, [results])

  const visibleResults = useMemo(() => {
    let filtered = results.filter((r) => {
      const matchesSearch = !search || r.team.name.toLowerCase().includes(search.toLowerCase())
      const matchesHackathon = !hackathonFilter || r.team.hackathonId === hackathonFilter
      return matchesSearch && matchesHackathon
    })

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "capacity") {
        const openA = a.team.maxSize - (a.team._count?.members ?? 0)
        const openB = b.team.maxSize - (b.team._count?.members ?? 0)
        return openB - openA
      }
      return b.score - a.score
    })

    return filtered
  }, [results, search, hackathonFilter, sortBy])

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="size-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        Loading teams...
      </div>
    )
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
    <div className="p-6 sm:p-10 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Discover teams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {results.length} open team{results.length !== 1 ? "s" : ""} forming right now, ranked by fit
          </p>
        </div>
        <Link
          href="/teams/create"
          className="text-sm font-medium bg-accent text-accent-foreground rounded-md px-4 py-2 shadow-sm shadow-accent/20 hover:opacity-90 hover:shadow-md hover:shadow-accent/30 transition-all shrink-0 self-start sm:self-auto"
        >
          + Create team
        </Link>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team name..."
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
          />
          <select
            value={hackathonFilter}
            onChange={(e) => setHackathonFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
          >
            <option value="">All hackathons</option>
            {hackathons.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
          >
            <option value="match">Sort: Best match</option>
            <option value="capacity">Sort: Most open spots</option>
          </select>
        </div>
      )}

      {results.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-xl px-6 py-14 text-center bg-card/40">
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
      ) : visibleResults.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-xl px-6 py-14 text-center bg-card/40">
          <p className="text-sm text-muted-foreground">No teams match your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleResults.map((result) => (
            <TeamMatchCard
              key={result.team.id}
              result={result}
              myProfile={myProfile}
              confirming={confirmTeamId === result.team.id}
              requesting={requestingTeamId === result.team.id}
              onOpenConfirm={() => setConfirmTeamId(result.team.id)}
              onCancelConfirm={() => setConfirmTeamId("")}
              onSendRequest={() => sendJoinRequest(result.team.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TeamMatchCard({
  result,
  myProfile,
  confirming,
  requesting,
  onOpenConfirm,
  onCancelConfirm,
  onSendRequest,
}: {
  result: TeamMatchResult
  myProfile: User | null
  confirming: boolean
  requesting: boolean
  onOpenConfirm: () => void
  onCancelConfirm: () => void
  onSendRequest: () => void
}) {
  const { team, score, breakdown, myMatch } = result
  const required = team.requiredSkills ?? []
  const mySkillIds = new Set((myProfile?.skills ?? []).map((s) => s.skillId))
  const missingSkills = required.filter((rs) => !mySkillIds.has(rs.skillId))
  const memberCount = team._count?.members ?? 0
  const isFull = memberCount >= team.maxSize
  const reasons = buildWhyThisMatch(required.length, missingSkills.length, breakdown)

  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/teams/${team.id}`} className="text-sm font-medium hover:text-accent transition-colors truncate">
              {team.name}
            </Link>
            <span className="text-xs font-medium rounded-full px-2 py-0.5 border text-accent bg-accent/10 border-accent/30 shrink-0">
              {team.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{team.hackathon?.name}</p>
          {team.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{team.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm text-accent font-semibold">{score}% match</div>
          <div className="text-xs text-muted-foreground mt-1">
            {memberCount} / {team.maxSize} members{isFull ? " · Full" : ""}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ScoreBreakdownBars breakdown={breakdown} />
      </div>

      {required.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {required.map((rs) => (
            <span
              key={rs.skillId}
              className={`text-xs rounded-full px-2.5 py-0.5 border ${
                mySkillIds.has(rs.skillId)
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border/60 bg-background text-muted-foreground"
              }`}
            >
              {rs.skill?.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs flex flex-col gap-1">
        {reasons.map((r) => (
          <span key={r.text} className={r.positive ? "text-muted-foreground" : "text-muted-foreground/70"}>
            {r.positive ? "✓" : "⚠"} {r.text}
          </span>
        ))}
        {missingSkills.length > 0 && (
          <span className="text-muted-foreground/70">
            ⚠ Missing: {missingSkills.map((s) => s.skill?.name).join(", ")}
          </span>
        )}
      </div>

      {/* Call to action — depends entirely on server-confirmed match state */}
      <div className="mt-4">
        {myMatch?.type === "JOIN_REQUEST" && myMatch.status === "PENDING" ? (
          <div className="text-sm text-center text-muted-foreground border border-dashed border-border rounded-md py-2">
            ⏳ Request pending
          </div>
        ) : myMatch?.type === "INVITATION" && myMatch.status === "PENDING" ? (
          <Link
            href={`/teams/${team.id}`}
            className="block text-center text-sm font-medium border border-accent/40 text-accent rounded-md py-2 hover:bg-accent/10 transition-colors"
          >
            You&apos;re invited — respond
          </Link>
        ) : myMatch?.status === "REJECTED" ? (
          <div className="text-sm text-center text-muted-foreground/70 border border-border/60 rounded-md py-2">
            {myMatch.type === "JOIN_REQUEST" ? "Your request was declined" : "Invitation declined"}
          </div>
        ) : isFull ? (
          <div className="text-sm text-center text-muted-foreground border border-border/60 rounded-md py-2">
            Team full
          </div>
        ) : confirming ? (
          <div className="border border-accent/30 bg-accent/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-3">
              Request to join <span className="text-foreground font-medium">{team.name}</span>? Your profile and skills will be shared with the team leader.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onCancelConfirm}
                disabled={requesting}
                className="flex-1 border border-border text-sm rounded-md py-1.5 hover:border-foreground/40 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={onSendRequest}
                disabled={requesting}
                className="flex-1 bg-accent text-accent-foreground text-sm font-medium rounded-md py-1.5 hover:opacity-90 transition-all disabled:opacity-40"
              >
                {requesting ? "Sending..." : "Send request"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenConfirm}
            className="w-full text-sm font-medium border border-border rounded-md py-2 hover:border-accent hover:text-accent transition-colors"
          >
            Request to join
          </button>
        )}
      </div>
    </div>
  )
}
