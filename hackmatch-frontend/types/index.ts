// ─── AUTH 
export type User = {
  id: string
  name: string
  email: string
  bio: string | null
  githubUrl: string | null
  portfolioUrl: string | null
  timezoneOffset: number
  availability: 'FULL_TIME' | 'PART_TIME' | 'WEEKENDS_ONLY'
  reliabilityScore: number
  skills: UserSkill[]
  createdAt: string
}

// ─── SKILLS 
export type Skill = {
  id: string
  name: string
}

export type UserSkill = {
  skillId: string
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'
  skill: Skill
}

// ─── HACKATHON 
export type Hackathon = {
  id: string
  name: string
  startDate: string
  endDate: string
  website: string | null
  createdAt: string
}

// ─── TEAM 
export type TeamMember = {
  id: string
  teamId: string
  userId: string
  joinedAt: string
  user?: User
}

export type TeamRequiredSkill = {
  teamId: string
  skillId: string
  skill: Skill
}

export type Team = {
  id: string
  name: string
  description: string | null
  hackathonId: string
  leaderId: string
  maxSize: number
  status: 'FORMING' | 'ACTIVE' | 'SUBMITTED' | 'DISBANDED'
  createdAt: string
  hackathon: Hackathon
  requiredSkills: TeamRequiredSkill[]
  // Optional (not every endpoint returns the full list) — every read already
  // uses `team.members?.length ?? 0`, so this stays safe everywhere.
  members?: TeamMember[]
  // Only present on GET /api/teams/:id — the leader sees every pending
  // invite/join-request on the team, everyone else sees only their own
  // (any status) relationship with this team.
  matches?: Match[]
  // Only present on GET /api/matches/my and GET /api/matches/teams
  leader?: User
  // Only present on GET /api/matches/teams (a lighter member count instead
  // of the full members array)
  _count?: { members: number }
}

// ─── MATCH
export type MatchType = 'INVITATION' | 'JOIN_REQUEST'

export type Match = {
  id: string
  teamId: string
  senderId: string
  receiverId: string
  score: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  type: MatchType
  createdAt: string
  team?: Team
  receiver?: User
}

export type ScoreBreakdown = {
  skillScore: number
  reliabilityScore: number
  timezoneScore: number
  commitmentScore: number
}

export type MatchResult = {
  candidate: User
  score: number
  breakdown: ScoreBreakdown
}

// A team ranked for the current user (GET /api/matches/teams) — the mirror
// image of MatchResult, plus the user's own existing relationship with that
// team, if any (so the UI knows whether to offer "Request to join" or show
// a pending/declined status instead).
export type TeamMatchResult = {
  team: Team
  score: number
  breakdown: ScoreBreakdown
  myMatch: { teamId: string; type: MatchType; status: Match['status'] } | null
}

// ─── NOTIFICATION
export type Notification = {
  id: string
  userId: string
  message: string
  read: boolean
  createdAt: string
}

// ─── API RESPONSES
export type AuthResponse = {
  token: string
  user: User
}

export type NotificationsResponse = {
  notifications: Notification[]
}

export type PendingInvitesResponse = {
  invites: Match[]
}