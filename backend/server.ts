/**
 * AURAQ Backend — Server Entry Point
 * Mounts CORS, JSON parsing, logging, and the /api router.
 */

import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';

export function createBackendApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'auraq-backend', timestamp: new Date().toISOString() });
  });

  return app;
}

// Standalone execution when run directly via node/tsx
if (process.argv[1]?.endsWith('backend/server.ts') || process.argv[1]?.endsWith('backend/server.js')) {
  const port = process.env.PORT || 5000;
  const app = createBackendApp();
  app.listen(port, () => {
    console.log(`[AURAQ Backend] Listening on http://localhost:${port}`);
  });
}
