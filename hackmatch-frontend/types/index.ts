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
  members: TeamMember[]
}

// ─── MATCH 
export type Match = {
  id: string
  teamId: string
  senderId: string
  receiverId: string
  score: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  team?: Team
}

export type MatchResult = {
  candidate: User
  score: number
  breakdown: {
    skillScore: number
    reliabilityScore: number
    timezoneScore: number
    commitmentScore: number
  }
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