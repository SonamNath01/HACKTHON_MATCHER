"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"
import { Team, Notification, Match } from "@/types"

export default function DashboardPage() {
  const { user } = useAuthStore()

  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [openTeams, setOpenTeams] = useState<Team[]>([])
  const [pendingInvites, setPendingInvites] = useState<Match[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadDashboard = async () => {
    try {
      const [teamsRes, allTeamsRes, invitesRes, notifRes] = await Promise.all([
        api.get("/api/teams/my"),
        api.get("/api/teams"),
        api.get("/api/matches/my"),
        api.get("/api/notifications"),
      ])
      const teams: Team[] = teamsRes.data.teams || []
      const myTeamIds = new Set(teams.map((t) => t.id))

      setMyTeams(teams)
      setOpenTeams(
        (allTeamsRes.data.teams || []).filter(
          (t: Team) => t.status === "FORMING" && !myTeamIds.has(t.id)
        )
      )
      setPendingInvites(invitesRes.data.invites || [])
      setNotifications(notifRes.data.notifications || [])
    } catch (err) {
      setError("Failed to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const markRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const [respondingId, setRespondingId] = useState("")

  const handleRespond = async (matchId: string, status: "ACCEPTED" | "REJECTED") => {
    setRespondingId(matchId)
    try {
      await api.patch(`/api/matches/${matchId}/respond`, { status })
      toast.success(status === "ACCEPTED" ? "Invitation accepted." : "Invitation rejected.")
      // Team membership/counts changed — reload everything rather than
      // trying to patch every derived count by hand.
      await loadDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to respond to invite.")
    } finally {
      setRespondingId("")
    }
  }

  const unread = notifications.filter((n) => !n.read).length

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="size-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "there"}.
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1.5">
          Here&apos;s what&apos;s happening with your teams.
        </p>
      </div>

      {error && (
        <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm mb-8">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border mb-10 shadow-sm">
        <StatCard label="Your teams" value={myTeams.length} />
        <StatCard label="Open teams" value={openTeams.length} accent={openTeams.length > 0} />
        <StatCard label="Pending invites" value={pendingInvites.length} accent={pendingInvites.length > 0} />
        <StatCard label="Unread" value={unread} accent={unread > 0} />
      </div>

      {/* Pending invitations — the thing most likely to need action right now */}
      {pendingInvites.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-4">
            Pending invitations
          </h2>
          <div className="flex flex-col gap-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-card border border-accent/30 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm shadow-accent/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    You&apos;re invited to join{" "}
                    <span className="font-medium">{invite.team?.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {invite.team?.hackathon?.name}
                    {invite.team?.leader?.name ? ` · Led by ${invite.team.leader.name}` : ""}
                    {" · "}
                    <span className="text-accent font-medium">{invite.score} / 100 match</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleRespond(invite.id, "ACCEPTED")}
                    disabled={respondingId === invite.id}
                    className="text-sm font-medium bg-accent text-accent-foreground rounded-md px-3.5 py-1.5 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {respondingId === invite.id ? "Working..." : "Accept"}
                  </button>
                  <button
                    onClick={() => handleRespond(invite.id, "REJECTED")}
                    disabled={respondingId === invite.id}
                    className="text-sm border border-border rounded-md px-3.5 py-1.5 hover:border-destructive/50 hover:text-destructive transition-colors disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              My teams
            </h2>
            <Link href="/teams/create" className="text-xs text-accent hover:opacity-80 font-medium transition-opacity">
              + New
            </Link>
          </div>

          {myTeams.length === 0 ? (
            <EmptyState
              message="You haven't joined a team yet."
              detail="Find teammates who match your skills."
              actionLabel="Find a team"
              actionHref="/teams"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {myTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}

          {openTeams.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Open teams looking for members
                </h3>
                <Link href="/teams" className="text-xs text-accent hover:opacity-80 font-medium transition-opacity">
                  Browse all
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {openTeams.slice(0, 3).map((team) => (
                  <TeamCard key={team.id} team={team} compact />
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Notifications
            </h2>
            {unread > 0 && <span className="text-xs text-accent font-medium">{unread} unread</span>}
          </div>

          {notifications.length === 0 ? (
            <EmptyState
              message="No notifications yet."
              detail="Team invitations and important team activity will appear here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.slice(0, 6).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markRead(notif.id)}
                  className={`rounded-lg px-4 py-3 border transition-all ${
                    notif.read
                      ? "bg-card border-border/60 text-muted-foreground"
                      : "bg-accent/10 border-accent/30 cursor-pointer hover:bg-accent/20 hover:shadow-md hover:shadow-accent/10"
                  }`}
                >
                  <p className="text-sm leading-snug">{notif.message}</p>
                  {!notif.read && (
                    <span className="text-xs text-accent font-medium mt-1 inline-block">
                      Click to mark read
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-10 pt-8 border-t border-border">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-4">
          Quick actions
        </h2>
        <div className="flex gap-3 flex-wrap">
          <QuickAction href="/teams" label="Browse teams" />
          <QuickAction href="/teams/create" label="Create team" />
          <QuickAction href="/profile" label="Edit profile" />
        </div>
      </div>
    </div>
  )
}

function TeamCard({ team, compact }: { team: Team; compact?: boolean }) {
  const memberCount = team.members?.length ?? 0
  const isFull = memberCount >= team.maxSize
  const pendingCount = team.matches?.length ?? 0

  return (
    <Link
      href={`/teams/${team.id}`}
      className="block bg-card border border-border/60 hover:border-accent/40 hover:shadow-md hover:shadow-black/10 rounded-lg px-4 py-3 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium truncate">{team.name}</span>
        <StatusBadge status={team.status} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {team.hackathon?.name || "No hackathon"}
      </p>
      {!compact && (
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-24">
            <div
              className={`h-full rounded-full ${isFull ? "bg-accent" : "bg-accent/60"}`}
              style={{ width: `${Math.min(100, (memberCount / team.maxSize) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {memberCount} / {team.maxSize} members{isFull ? " · Full" : ""}
          </span>
          {pendingCount > 0 && (
            <span className="text-xs text-accent ml-auto">
              {pendingCount} pending invite{pendingCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-card px-5 py-5 transition-colors hover:bg-muted/30">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-medium">{label}</div>
      <div className={`font-heading text-3xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "FORMING"
  return (
    <span
      className={`text-xs font-medium rounded-full px-2.5 py-0.5 border shrink-0 ${
        isActive ? "text-accent bg-accent/10 border-accent/30" : "text-muted-foreground bg-background border-border"
      }`}
    >
      {status}
    </span>
  )
}

function EmptyState({
  message,
  detail,
  actionLabel,
  actionHref,
}: {
  message: string
  detail?: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="border border-dashed border-border/60 rounded-lg px-6 py-9 text-center bg-card/40">
      <p className="text-sm text-muted-foreground">{message}</p>
      {detail && <p className="text-xs text-muted-foreground/70 mt-1">{detail}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="text-xs font-medium border border-border rounded-md px-4 py-1.5 inline-block mt-3 hover:border-accent hover:text-accent transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm border border-border rounded-md px-4 py-2 hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors">
      {label}
    </Link>
  )
}
