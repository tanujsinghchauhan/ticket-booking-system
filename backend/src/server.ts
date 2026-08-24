import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { initSocket } from './config/socket.js';
import { initMailer } from './config/mailer.js';
import { initHoldExpiryJob } from './jobs/holdExpiry.job.js';
import { initWaitlistOfferJob } from './jobs/waitlistOffer.job.js';

const server = http.createServer(app);

initSocket(server);

async function startServer() {
  try {
    await initMailer();

    initHoldExpiryJob();
    initWaitlistOfferJob();

    console.log('Background cron jobs registered successfully.');

    const PORT = env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
