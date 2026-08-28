"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"
import { Skill, User } from "@/types"

const PROFICIENCY_LEVELS = ["BEGINNER", "INTERMEDIATE", "EXPERT"] as const

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState("")
  const [selectedProficiency, setSelectedProficiency] = useState<typeof PROFICIENCY_LEVELS[number]>("BEGINNER")
  const [addingSkill, setAddingSkill] = useState(false)
  const [removingSkillId, setRemovingSkillId] = useState("")
  const [skillError, setSkillError] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, skillsRes] = await Promise.all([
          api.get("/api/auth/me"),
          api.get("/api/skills"),
        ])
        setProfile(profileRes.data.user || profileRes.data)
        setAllSkills(skillsRes.data.skills || [])
      } catch (err) {
        setError("Failed to load profile.")
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const availableSkills = allSkills.filter(
    (skill) => !profile?.skills?.some((s) => s.skillId === skill.id)
  )

  const handleAddSkill = async () => {
    if (!selectedSkillId) return
    setAddingSkill(true)
    setSkillError("")
    try {
      const res = await api.post("/api/skills/me", {
        skillId: selectedSkillId,
        proficiency: selectedProficiency,
      })
      const added = res.data.userSkill
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              skills: [...prev.skills.filter((s) => s.skillId !== added.skillId), added],
            }
          : prev
      )
      setSelectedSkillId("")
      setSelectedProficiency("BEGINNER")
    } catch (err: any) {
      setSkillError(err.response?.data?.message || "Failed to add skill.")
    } finally {
      setAddingSkill(false)
    }
  }

  const handleRemoveSkill = async (skillId: string) => {
    setRemovingSkillId(skillId)
    setSkillError("")
    try {
      await api.delete(`/api/skills/me/${skillId}`)
      setProfile((prev) =>
        prev ? { ...prev, skills: prev.skills.filter((s) => s.skillId !== skillId) } : prev
      )
    } catch (err: any) {
      setSkillError(err.response?.data?.message || "Failed to remove skill.")
    } finally {
      setRemovingSkillId("")
    }
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="size-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        Loading profile...
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
  if (!profile) return <div className="p-10 text-sm text-muted-foreground">Profile not found.</div>

  return (
    <div className="p-6 sm:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center font-heading text-2xl font-bold text-accent shrink-0 shadow-sm shadow-accent/10">
          {profile.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight truncate">{profile.name}</h1>
          <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
        </div>
      </div>

      {profile.bio && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Bio</h2>
          <p className="text-sm text-foreground leading-relaxed bg-card border border-border/60 rounded-lg px-4 py-3">
            {profile.bio}
          </p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border shadow-sm">
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
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:opacity-80 transition-opacity truncate">
                {profile.githubUrl}
              </a>
            )}
            {profile.portfolioUrl && (
              <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:opacity-80 transition-opacity truncate">
                {profile.portfolioUrl}
              </a>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Skills</h2>
        {profile.skills && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.skills.map((s) => (
              <div key={s.skillId} className="flex items-center gap-2 bg-card border border-border/60 rounded-full pl-3 pr-1.5 py-1.5 transition-colors hover:border-accent/40">
                <span className="text-sm">{s.skill?.name}</span>
                <span className="text-xs text-accent bg-accent/10 rounded-full px-2 py-0.5">{s.proficiency}</span>
                <button
                  onClick={() => handleRemoveSkill(s.skillId)}
                  disabled={removingSkillId === s.skillId}
                  aria-label={`Remove ${s.skill?.name}`}
                  className="size-5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors disabled:opacity-40"
                >
                  {removingSkillId === s.skillId ? (
                    <span className="size-2.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                  ) : (
                    "×"
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">No skills added yet.</p>
        )}

        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <select
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
          >
            <option value="">
              {availableSkills.length === 0 ? "No more skills to add" : "Select a skill"}
            </option>
            {availableSkills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
          <select
            value={selectedProficiency}
            onChange={(e) => setSelectedProficiency(e.target.value as typeof PROFICIENCY_LEVELS[number])}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-shadow"
          >
            {PROFICIENCY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddSkill}
            disabled={!selectedSkillId || addingSkill}
            className="flex items-center justify-center gap-2 bg-accent text-accent-foreground text-sm font-medium rounded-md px-4 py-2 shadow-sm shadow-accent/20 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {addingSkill && (
              <span className="size-3.5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" />
            )}
            {addingSkill ? "Adding..." : "+ Add skill"}
          </button>
        </div>
        {skillError && (
          <p className="text-xs text-destructive mt-2">{skillError}</p>
        )}
      </section>
    </div>
  )
}

function DetailCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card px-5 py-5 transition-colors hover:bg-muted/30">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-medium">{label}</div>
      <div className={`font-heading text-lg font-bold capitalize ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  )
}