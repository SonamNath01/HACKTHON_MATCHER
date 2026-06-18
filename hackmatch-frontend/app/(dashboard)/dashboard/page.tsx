"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import api from "@/lib/axios"
import { useAuthStore } from "@/stores/authStore"
import { Team, Notification } from "@/types"

export default function DashboardPage() {
  const { user } = useAuthStore()

  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [teamsRes, notifRes] = await Promise.all([
          api.get("/api/teams/my"),
          api.get("/api/notifications"),
        ])
        setMyTeams(teamsRes.data)
        setNotifications(notifRes.data.notifications || [])
      } catch (err) {
        setError("Failed to load dashboard data.")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
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

  const unread = notifications.filter((n) => !n.read).length
  const openTeams = myTeams.filter((t) => t.status === "FORMING")

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading dashboard...</div>
  }

  return (
    <div className="p-8 sm:p-10 max-w-5xl">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "there"}.
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening with your teams.
        </p>
      </div>

      {error && (
        <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm mb-8">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border border-border mb-10">
        <StatCard label="Your teams" value={myTeams.length} />
        <StatCard label="Open teams" value={openTeams.length} accent={openTeams.length > 0} />
        <StatCard label="Unread" value={unread} accent={unread > 0} />
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              My teams
            </h2>
            <Link href="/teams/create" className="text-xs text-accent hover:opacity-80 font-medium">
              + New
            </Link>
          </div>

          {myTeams.length === 0 ? (
            <EmptyState message="You're not on any team yet." actionLabel="Browse teams" actionHref="/teams" />
          ) : (
            <div className="flex flex-col gap-2">
              {myTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="block bg-card border border-border/60 hover:border-border rounded-md px-4 py-3 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{team.name}</span>
                    <StatusBadge status={team.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {team.hackathon?.name || "No hackathon"}
                  </p>
                </Link>
              ))}
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
            <EmptyState message="No notifications yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.slice(0, 6).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markRead(notif.id)}
                  className={`rounded-md px-4 py-3 border transition-colors ${
                    notif.read
                      ? "bg-card border-border/60 text-muted-foreground"
                      : "bg-accent/10 border-accent/30 cursor-pointer hover:bg-accent/20"
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

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-card px-5 py-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
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
      className={`text-xs font-medium rounded-full px-2.5 py-0.5 border ${
        isActive ? "text-accent bg-accent/10 border-accent/30" : "text-muted-foreground bg-background border-border"
      }`}
    >
      {status}
    </span>
  )
}

function EmptyState({ message, actionLabel, actionHref }: { message: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="border border-border/60 rounded-md px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="text-xs font-medium border border-border rounded-md px-4 py-1.5 inline-block hover:border-accent hover:text-accent transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm border border-border rounded-md px-4 py-2 hover:border-accent hover:text-accent transition-colors">
      {label}
    </Link>
  )
}