import express from 'express';
import cors from 'cors';
import 'express-async-errors';

import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';

import authRouter from './modules/auth/auth.routes.js';
import venuesRouter from './modules/venues/venues.routes.js';
import eventsRouter from './modules/events/events.routes.js';
import seatsRouter from './modules/seats/seats.routes.js';
import bookingsRouter from './modules/bookings/bookings.routes.js';
import waitlistRouter from './modules/waitlist/waitlist.routes.js';

const app = express();

app.use(express.json());

const allowedOrigins = [env.FRONTEND_URL];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (health checks, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use('/api/auth', authRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/shows', seatsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/waitlist', waitlistRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use(errorMiddleware);

export default app;
