// app/(dashboard)/teams/[id]/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"
import { Team, MatchResult, ScoreBreakdown } from "@/types"
import { ScoreBreakdownBars, buildWhyThisMatch } from "@/components/score-breakdown"

const STATUS_OPTIONS = ["FORMING", "ACTIVE", "SUBMITTED", "DISBANDED"] as const

export default function TeamDetailPage() {
  const { id } = useParams() as { id: string }
  const { user } = useAuthStore()

  const [team, setTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [myMatchPreview, setMyMatchPreview] = useState<{ score: number; breakdown: ScoreBreakdown } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [invitingCandidateId, setInvitingCandidateId] = useState("")
  const [invitedCandidateIds, setInvitedCandidateIds] = useState<Set<string>>(new Set())

  const [showJoinConfirm, setShowJoinConfirm] = useState(false)
  const [requestingJoin, setRequestingJoin] = useState(false)

  const [respondingMatchId, setRespondingMatchId] = useState("")
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

  // Re-pulls everything derived from the server after any mutation (invite,
  // respond, join request) — simpler and safer than hand-patching every
  // derived count (member count, candidate list, match state) in local state.
  const refreshAll = async () => {
    const fetchedTeam = await fetchTeam()
    if (fetchedTeam.leaderId === user?.id) {
      const matchesRes = await api.get(`/api/teams/${id}/matches`)
      setMatches(matchesRes.data.matches || [])
    }
    return fetchedTeam
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedTeam = await fetchTeam()
        const isLeader = fetchedTeam.leaderId === user?.id
        const isMember = fetchedTeam.members?.some((m) => m.userId === user?.id) ?? false

        if (isLeader) {
          const matchesRes = await api.get(`/api/teams/${id}/matches`)
          setMatches(matchesRes.data.matches || [])
        } else if (!isMember && (fetchedTeam.matches?.length ?? 0) === 0 && fetchedTeam.status === "FORMING") {
          // Not a member, no existing invite/request on this team, and the
          // team's still open — show a live match preview before they ask to join.
          try {
            const previewRes = await api.get(`/api/teams/${id}/my-match`)
            setMyMatchPreview(previewRes.data)
          } catch {
            // Non-critical preview — the request-to-join flow still works without it.
          }
        }
      } catch (err) {
        setError("Failed to load team.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await refreshAll()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send invite.")
    } finally {
      if (candidateId) setInvitingCandidateId("")
      else setInviting(false)
    }
  }

  const sendJoinRequest = async () => {
    setRequestingJoin(true)
    try {
      await api.post(`/api/teams/${id}/request-join`)
      toast.success("Join request sent.")
      setShowJoinConfirm(false)
      await fetchTeam()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send join request.")
      // The team may have just filled up or another request may already
      // exist — pull the real current state instead of trusting local state.
      await fetchTeam()
    } finally {
      setRequestingJoin(false)
    }
  }

  const handleRespond = async (matchId: string, status: "ACCEPTED" | "REJECTED") => {
    if (status === "REJECTED" && !window.confirm("Reject this?")) return

    setRespondingMatchId(matchId)
    setRespondingAction(status)
    try {
      await api.patch(`/api/matches/${matchId}/respond`, { status })
      toast.success(status === "ACCEPTED" ? "Accepted." : "Rejected.")
      await refreshAll()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to respond.")
      await refreshAll()
    } finally {
      setRespondingMatchId("")
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
  const isMember = team.members?.some((m) => m.userId === user?.id) ?? false
  const memberCount = team.members?.length ?? team._count?.members ?? 0
  const isFull = memberCount >= team.maxSize
  const leaderName = team.members?.find((m) => m.userId === team.leaderId)?.user?.name

  // Non-leaders only ever see their own relationship with this team (any
  // status) — never another candidate's. Since receiverId always identifies
  // "the candidate" regardless of direction, there's at most one such row.
  const myMatch = !isLeader ? team.matches?.[0] : undefined
  const myPendingInvite = myMatch?.status === "PENDING" && myMatch.type === "INVITATION" ? myMatch : undefined
  const myPendingJoinRequest = myMatch?.status === "PENDING" && myMatch.type === "JOIN_REQUEST" ? myMatch : undefined
  const myDeclinedMatch = myMatch?.status === "REJECTED" ? myMatch : undefined

  // Leaders see every pending relationship on the team, split by direction:
  // invitations they sent (still awaiting the candidate) vs. join requests
  // they received (still awaiting their own decision).
  const pendingInvitesSent = isLeader
    ? (team.matches ?? []).filter((m) => m.status === "PENDING" && m.type === "INVITATION")
    : []
  const joinRequestsReceived = isLeader
    ? (team.matches ?? []).filter((m) => m.status === "PENDING" && m.type === "JOIN_REQUEST")
    : []

  const canRequestToJoin = !isLeader && !isMember && !myMatch

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

      {/* Leader — join requests (candidates asking to join, awaiting a decision) */}
      {isLeader && joinRequestsReceived.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Join requests ({joinRequestsReceived.length})
          </h2>
          <div className="flex flex-col gap-3">
            {joinRequestsReceived.map((reqMatch) => {
              const candidate = reqMatch.receiver
              const required = team.requiredSkills ?? []
              const candidateSkillIds = new Set((candidate?.skills ?? []).map((s) => s.skillId))
              const missingSkills = required.filter((rs) => !candidateSkillIds.has(rs.skillId))
              const isResponding = respondingMatchId === reqMatch.id

              return (
                <div key={reqMatch.id} className="bg-card border border-accent/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                      {candidate?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{candidate?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{candidate?.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-accent font-semibold">{reqMatch.score}% match</div>
                      {typeof candidate?.reliabilityScore === "number" && (
                        <div className="text-xs text-muted-foreground">Reliability {candidate.reliabilityScore}/100</div>
                      )}
                    </div>
                  </div>

                  {candidate?.skills && candidate.skills.length > 0 && (
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

                  {missingSkills.length > 0 && (
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      ⚠ Missing: {missingSkills.map((s) => s.skill?.name).join(", ")}
                    </p>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleRespond(reqMatch.id, "ACCEPTED")}
                      disabled={isResponding || isFull}
                      className="flex-1 bg-accent text-accent-foreground text-sm font-medium rounded-md py-2 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40"
                    >
                      {isResponding && respondingAction === "ACCEPTED" ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      onClick={() => handleRespond(reqMatch.id, "REJECTED")}
                      disabled={isResponding}
                      className="flex-1 border border-border text-sm rounded-md py-2 hover:border-destructive/50 hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      {isResponding && respondingAction === "REJECTED" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                  {isFull && (
                    <p className="text-xs text-muted-foreground/70 mt-2">Team is full — reject or wait for a spot to open up.</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Pending invitations (leader-only visibility — people the leader invited) */}
      {isLeader && pendingInvitesSent.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Pending invitations ({pendingInvitesSent.length})
          </h2>
          <div className="flex flex-col gap-2">
            {pendingInvitesSent.map((invite) => (
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
                disabled={respondingMatchId === myPendingInvite.id}
                className="flex-1 bg-accent text-accent-foreground text-sm font-medium rounded-md py-2 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40"
              >
                {respondingMatchId === myPendingInvite.id && respondingAction === "ACCEPTED" ? "Accepting..." : "Accept"}
              </button>
              <button
                onClick={() => handleRespond(myPendingInvite.id, "REJECTED")}
                disabled={respondingMatchId === myPendingInvite.id}
                className="flex-1 border border-border text-sm rounded-md py-2 hover:border-destructive/50 hover:text-destructive transition-colors disabled:opacity-40"
              >
                {respondingMatchId === myPendingInvite.id && respondingAction === "REJECTED" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Your own pending join request — read-only, waiting on the leader */}
      {myPendingJoinRequest && (
        <section className="mb-8">
          <div className="border border-dashed border-border rounded-xl p-5 bg-card/40">
            <p className="text-sm">
              ⏳ Your request to join <span className="font-medium">{team.name}</span> is pending.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Match score: <span className="text-accent font-medium">{myPendingJoinRequest.score} / 100</span>
              {" · "}Waiting for {leaderName || "the team leader"} to respond.
            </p>
          </div>
        </section>
      )}

      {/* A previous invite/request that didn't go through */}
      {myDeclinedMatch && (
        <section className="mb-8">
          <div className="border border-border/60 rounded-xl p-5 bg-card/40">
            <p className="text-sm text-muted-foreground">
              {myDeclinedMatch.type === "JOIN_REQUEST"
                ? "Your request to join this team was declined."
                : "This invitation was declined."}
            </p>
          </div>
        </section>
      )}

      {/* Candidate — request to join */}
      {canRequestToJoin && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
            Join this team
          </h2>
          {team.status !== "FORMING" ? (
            <div className="bg-card border border-border/60 rounded-xl p-5 text-sm text-muted-foreground">
              This team isn&apos;t accepting join requests right now.
            </div>
          ) : isFull ? (
            <div className="bg-card border border-border/60 rounded-xl p-5 text-sm text-muted-foreground">
              This team is full — check back later or find another team.
            </div>
          ) : !showJoinConfirm ? (
            <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm">Think you&apos;d be a good fit for {team.name}?</p>
                {myMatchPreview && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimated match: <span className="text-accent font-medium">{myMatchPreview.score}% </span>
                    based on your current profile.
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowJoinConfirm(true)}
                className="bg-accent text-accent-foreground text-sm font-medium rounded-md px-4 py-2 shadow-sm shadow-accent/20 hover:opacity-90 transition-all shrink-0"
              >
                Request to join
              </button>
            </div>
          ) : (
            <div className="border border-accent/30 bg-accent/10 rounded-xl p-5">
              <h3 className="text-sm font-medium mb-1">Request to join {team.name}?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {team.hackathon?.name} · Your profile and skills will be shared with the team leader.
              </p>
              {myMatchPreview && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Estimated match: <span className="text-accent font-medium">{myMatchPreview.score} / 100</span>
                  </p>
                  <ScoreBreakdownBars breakdown={myMatchPreview.breakdown} />
                </>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowJoinConfirm(false)}
                  disabled={requestingJoin}
                  className="flex-1 border border-border text-sm rounded-md py-2 hover:border-foreground/40 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={sendJoinRequest}
                  disabled={requestingJoin}
                  className="flex-1 bg-accent text-accent-foreground text-sm font-medium rounded-md py-2 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40"
                >
                  {requestingJoin ? "Sending..." : "Send request"}
                </button>
              </div>
            </div>
          )}
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

  const reasons = buildWhyThisMatch(required.length, missingSkills.length, breakdown)

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
      <div className="mt-3">
        <ScoreBreakdownBars breakdown={breakdown} />
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
