import express from 'express';
import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);

export default app;