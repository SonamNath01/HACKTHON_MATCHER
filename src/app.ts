import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'
import teamRoutes from './routes/team.routes'
import matchRoutes from './routes/match.routes'
import notificationRoutes from './routes/notification.routes'
import hackathonRoutes from "./routes/hackathon.routes"
import skillRoutes from './routes/skill.routes'

const app = express()

const allowedOrigins = [
  "http://localhost:3000",
  "https://hackmatch-frontend-dusky.vercel.app",
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin))

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))


app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/notifications', notificationRoutes)
app.use("/api/hackathons", hackathonRoutes)
app.use("/api/skills", skillRoutes)

// Unknown route
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' })
})

// Global error handler — last resort net for anything a controller didn't
// catch (JSON parse errors, unexpected throws). Never leak stack traces,
// file paths, or DB error details to the client.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err)

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' })
  }

  res.status(err?.status || 500).json({ message: 'Internal server error' })
})

export default app
