import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import teamRoutes from './routes/team.routes'
import notificationRoutes from './routes/notification.routes'
import hackathonRoutes from "./routes/hackathon.routes"
import skillRoutes from './routes/skill.routes'

const app = express()

const allowedOrigins = [
  "http://localhost:3000",
  "https://hackmatch-frontend-dusky.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))


app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/notifications', notificationRoutes)
app.use("/api/hackathons", hackathonRoutes)
app.use("/api/skills", skillRoutes)

export default app
