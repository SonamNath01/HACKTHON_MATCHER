"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"
import { User } from "@/types"

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/auth/me")
        setProfile(res.data.user || res.data)
      } catch (err) {
        setError("Failed to load profile.")
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  if (loading) return <div className="p-10 text-sm text-muted-foreground">Loading profile...</div>
  if (error) {
    return (
      <div className="p-10">
        <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      </div>
    )
  }
  if (!profile) return <div className="p-10 text-sm text-muted-foreground">Profile not found.</div>

  return (
    <div className="p-8 sm:p-10 max-w-3xl">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center font-heading text-xl font-bold text-accent">
          {profile.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {profile.bio && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Bio</h2>
          <p className="text-sm text-foreground leading-relaxed bg-card border border-border/60 rounded-md px-4 py-3">
            {profile.bio}
          </p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border border-border">
          <DetailCard label="Timezone" value={`UTC${profile.timezoneOffset >= 0 ? "+" : ""}${profile.timezoneOffset}`} />
          <DetailCard label="Availability" value={profile.availability.replace(/_/g, " ")} />
          <DetailCard label="Reliability" value={`${profile.reliabilityScore} / 100`} accent />
        </div>
      </section>

      {(profile.githubUrl || profile.portfolioUrl) && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Links</h2>
          <div className="flex flex-col gap-2">
            {profile.githubUrl && (
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:opacity-80 transition-opacity">
                {profile.githubUrl}
              </a>
            )}
            {profile.portfolioUrl && (
              <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:opacity-80 transition-opacity">
                {profile.portfolioUrl}
              </a>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Skills</h2>
        {profile.skills && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <div key={s.skillId} className="flex items-center gap-2 bg-card border border-border/60 rounded-full px-3 py-1.5">
                <span className="text-sm">{s.skill?.name}</span>
                <span className="text-xs text-accent bg-accent/10 rounded-full px-2 py-0.5">{s.proficiency}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No skills added yet.</p>
        )}
      </section>
    </div>
  )
}

function DetailCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card px-5 py-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
      <div className={`font-heading text-lg font-bold capitalize ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  )
}