import express from 'express';
import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';
import notificationRoutes from './routes/notification.routes';
import hackathonRoutes from "./routes/hackathon.routes"

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/notifications', notificationRoutes);

app.use("/api/hackathons", hackathonRoutes)

export default app;