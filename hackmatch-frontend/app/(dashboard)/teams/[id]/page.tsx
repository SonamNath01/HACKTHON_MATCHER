// app/(dashboard)/teams/[id]/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"
import { Team, MatchResult, User } from "@/types"

const STATUS_OPTIONS = ["FORMING", "ACTIVE", "SUBMITTED", "DISBANDED"] as const

export default function TeamDetailPage() {
  const { id } = useParams() as { id: string }
  const { user } = useAuthStore()

  const [team, setTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [invitingCandidateId, setInvitingCandidateId] = useState("")
  const [invitedCandidateIds, setInvitedCandidateIds] = useState<Set<string>>(new Set())

  const [respondingAction, setRespondingAction] = useState<"ACCEPTED" | "REJECTED" | "">("")
  const [statusChoice, setStatusChoice] = useState<string>("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchTeam = async () => {
    const teamRes = await api.get(`/api/teams/${id}`)
    const fetchedTeam: Team = teamRes.data.team
    setTeam(fetchedTeam)
    setStatusChoice(fetchedTeam.status)
    return fetchedTeam
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedTeam = await fetchTeam()
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

  const sendInvite = async (email: string, candidateId?: string) => {
    if (!email) return
    if (candidateId) setInvitingCandidateId(candidateId)
    else setInviting(true)
    try {
      await api.post(`/api/teams/${id}/invite`, { email })
      toast.success(`Invite sent to ${email}.`)
      if (candidateId) {
        setInvitedCandidateIds((prev) => new Set(prev).add(candidateId))
      } else {
        setInviteEmail("")
      }
      await fetchTeam()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send invite.")
    } finally {
      if (candidateId) setInvitingCandidateId("")
      else setInviting(false)
    }
  }

  const handleRespond = async (matchId: string, status: "ACCEPTED" | "REJECTED") => {
    if (status === "REJECTED" && !window.confirm("Reject this invitation?")) return

    setRespondingAction(status)
    try {
      await api.patch(`/api/matches/${matchId}/respond`, { status })
      toast.success(status === "ACCEPTED" ? "You joined the team!" : "Invitation rejected.")
      await fetchTeam()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to respond to invite.")
    } finally {
      setRespondingAction("")
    }
  }

  const handleStatusUpdate = async () => {
    if (!team || statusChoice === team.status) return
    if (statusChoice === "DISBANDED" && !window.confirm(
      "Disband this team? Every member's reliability score will take a small hit, and this can't be undone."
    )) return

    setUpdatingStatus(true)
    try {
      const res = await api.patch(`/api/teams/${id}/status`, { status: statusChoice })
      setTeam(res.data.team)
      toast.success(`Team status set to ${statusChoice}.`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update team status.")
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="size-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        Loading team...
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
  if (!team) {
    return <div className="p-10 text-sm text-muted-foreground">Team not found.</div>
  }

  const isLeader = team.leaderId === user?.id
  const memberCount = team.members?.length ?? 0
  const isFull = memberCount >= team.maxSize
  const leaderName = team.members?.find((m) => m.userId === team.leaderId)?.user?.name

  const myPendingInvite = team.matches?.find(
    (m) => m.receiverId === user?.id && m.status === "PENDING"
  )
  const otherPendingInvites = isLeader
    ? (team.matches ?? []).filter((m) => m.status === "PENDING" && m.receiverId !== user?.id)
    : []

  return (
    <div className="p-6 sm:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">{team.name}</h1>
          <span className="text-xs font-medium rounded-full px-2.5 py-0.5 border text-accent bg-accent/10 border-accent/30 shrink-0">
            {team.status}
          </span>
        </div>
        {team.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{team.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-xs text-muted-foreground">{team.hackathon?.name}</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isFull ? "bg-accent" : "bg-accent/60"}`}
                style={{ width: `${Math.min(100, (memberCount / team.maxSize) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {memberCount} / {team.maxSize} members
            </span>
          </div>
          {isFull && (
            <span className="text-xs font-medium text-accent">Team full</span>
          )}
        </div>
      </div>

      {/* Leader — team status control */}
      {isLeader && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Team status
          </h2>
          <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              value={statusChoice}
              onChange={(e) => setStatusChoice(e.target.value)}
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus || statusChoice === team.status}
              className="text-sm font-medium border border-border rounded-md px-4 py-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {updatingStatus ? "Updating..." : "Update status"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Marking the team SUBMITTED rewards every member&apos;s reliability score; DISBANDED costs a small penalty.
          </p>
        </section>
      )}

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

      {/* Team members (accepted only) */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
          Team members ({memberCount})
        </h2>
        <div className="flex flex-col gap-2">
          {team.members?.map((member) => (
            <div
              key={member.id}
              className="bg-card border border-border/60 rounded-lg px-4 py-3 transition-colors hover:border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                  {member.user?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{member.user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                </div>
                <span
                  className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 ${
                    team.leaderId === member.userId
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground bg-muted"
                  }`}
                >
                  {team.leaderId === member.userId ? "Leader" : "Member"}
                </span>
                {typeof member.user?.reliabilityScore === "number" && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    Reliability {member.user.reliabilityScore}/100
                  </span>
                )}
              </div>
              {member.user?.skills && member.user.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 pl-11">
                  {member.user.skills.map((s) => (
                    <span
                      key={s.skillId}
                      className="text-xs bg-background border border-border/60 rounded-full pl-2 pr-1.5 py-0.5 text-muted-foreground"
                    >
                      {s.skill?.name}
                      <span className="ml-1 text-accent">{s.proficiency}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pending invitations (leader-only visibility) */}
      {isLeader && otherPendingInvites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Pending invitations ({otherPendingInvites.length})
          </h2>
          <div className="flex flex-col gap-2">
            {otherPendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-card border border-dashed border-border rounded-lg px-4 py-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {invite.receiver?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{invite.receiver?.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {invite.receiver?.skills?.slice(0, 4).map((s) => (
                      <span key={s.skillId} className="text-xs text-muted-foreground bg-background border border-border/60 rounded-full px-2 py-0.5">
                        {s.skill?.name}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">⏳ Waiting for response</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your own pending invite — accept/reject */}
      {myPendingInvite && (
        <section className="mb-8">
          <div className="border border-accent/30 bg-accent/10 rounded-xl p-5 shadow-sm shadow-accent/10">
            <h2 className="text-sm font-medium mb-1">Team invitation</h2>
            <p className="text-xs text-muted-foreground mb-1">
              You&apos;ve been invited to join <span className="font-medium text-foreground">{team.name}</span>
              {leaderName ? ` — led by ${leaderName}` : ""}.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Compatibility score:{" "}
              <span className="text-accent font-medium">{myPendingInvite.score} / 100</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRespond(myPendingInvite.id, "ACCEPTED")}
                disabled={!!respondingAction}
                className="flex-1 bg-accent text-accent-foreground text-sm font-medium rounded-md py-2 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40"
              >
                {respondingAction === "ACCEPTED" ? "Accepting..." : "Accept"}
              </button>
              <button
                onClick={() => handleRespond(myPendingInvite.id, "REJECTED")}
                disabled={!!respondingAction}
                className="flex-1 border border-border text-sm rounded-md py-2 hover:border-destructive/50 hover:text-destructive transition-colors disabled:opacity-40"
              >
                {respondingAction === "REJECTED" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Leader — invite by email */}
      {isLeader && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Invite someone by email
          </h2>
          {isFull ? (
            <div className="bg-card border border-border/60 rounded-xl p-5 text-sm text-muted-foreground">
              This team is full. Invitations can&apos;t be sent until a spot opens up.
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && inviteEmail && !inviting && sendInvite(inviteEmail)}
                  placeholder="candidate@email.com"
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
                />
                <button
                  onClick={() => sendInvite(inviteEmail)}
                  disabled={!inviteEmail || inviting}
                  className="bg-accent text-accent-foreground text-sm font-medium rounded-md px-4 py-2 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {inviting ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Leader — ranked candidates */}
      {isLeader && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Top candidates
          </h2>
          {matches.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-xl px-6 py-9 text-center bg-card/40">
              <p className="text-sm text-muted-foreground">No strong matches yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Candidates show up here once someone on the platform shares a required skill with this team.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matches.map((result) => (
                <CandidateCard
                  key={result.candidate.id}
                  team={team}
                  result={result}
                  inviting={invitingCandidateId === result.candidate.id}
                  invited={invitedCandidateIds.has(result.candidate.id) || isFull}
                  onInvite={() => sendInvite(result.candidate.email, result.candidate.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function CandidateCard({
  team,
  result,
  inviting,
  invited,
  onInvite,
}: {
  team: Team
  result: MatchResult
  inviting: boolean
  invited: boolean
  onInvite: () => void
}) {
  const { candidate, score, breakdown } = result
  const required = team.requiredSkills ?? []
  const candidateSkillIds = new Set((candidate.skills ?? []).map((s) => s.skillId))
  const missingSkills = required.filter((rs) => !candidateSkillIds.has(rs.skillId))

  const reasons = buildWhyThisMatch(required.length, missingSkills.length, candidate, breakdown)

  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 transition-colors hover:border-border">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
          {candidate.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{candidate.name}</p>
          <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm text-accent font-semibold">{score}% match</div>
          <div className="w-20 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-[width]" style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      {/* Score breakdown out of the real formula weights */}
      <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-muted-foreground">
        <BreakdownBar label="Skills" value={breakdown.skillScore} max={40} />
        <BreakdownBar label="Reliability" value={breakdown.reliabilityScore} max={30} />
        <BreakdownBar label="Timezone" value={breakdown.timezoneScore} max={20} />
        <BreakdownBar label="Commitment" value={breakdown.commitmentScore} max={10} />
      </div>

      {candidate.skills && candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {candidate.skills.map((s) => (
            <span
              key={s.skillId}
              className={`text-xs rounded-full pl-2 pr-1.5 py-0.5 border ${
                candidateSkillIds.has(s.skillId) && required.some((rs) => rs.skillId === s.skillId)
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border/60 bg-background text-muted-foreground"
              }`}
            >
              {s.skill?.name}
              <span className="ml-1 opacity-70">{s.proficiency}</span>
            </span>
          ))}
        </div>
      )}

      {/* Why this match */}
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

      <button
        onClick={onInvite}
        disabled={inviting || invited}
        className="mt-4 w-full text-sm font-medium border border-border rounded-md py-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {invited ? "Invited ✓" : inviting ? "Inviting..." : "Invite to team"}
      </button>
    </div>
  )
}

function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-accent/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function buildWhyThisMatch(
  requiredCount: number,
  missingCount: number,
  candidate: User,
  breakdown: MatchResult["breakdown"]
) {
  const matchedCount = requiredCount - missingCount
  const reasons: { positive: boolean; text: string }[] = []

  if (requiredCount > 0) {
    reasons.push({ positive: missingCount === 0, text: `${matchedCount}/${requiredCount} required skills` })
  }

  reasons.push({
    positive: candidate.reliabilityScore >= 70,
    text:
      candidate.reliabilityScore >= 70
        ? "High reliability"
        : candidate.reliabilityScore >= 50
        ? "Average reliability"
        : "Still building reliability",
  })

  reasons.push({
    positive: breakdown.timezoneScore >= 16,
    text:
      breakdown.timezoneScore >= 16
        ? "Similar timezone"
        : breakdown.timezoneScore >= 10
        ? "Workable timezone overlap"
        : "Different timezone",
  })

  reasons.push({
    positive: breakdown.commitmentScore === 10,
    text:
      breakdown.commitmentScore === 10
        ? "Same availability"
        : breakdown.commitmentScore >= 5
        ? "Compatible availability"
        : "Different availability",
  })

  return reasons
}
