/**
 * AgentL2 Runtime API Server
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pino } from 'pino';
import { agentRoutes } from './routes/agents.js';
import { orderRoutes } from './routes/orders.js';

const logger = pino({ name: 'api' });
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Could add DB ping here
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: String(err) });
  }
});

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/orders', orderRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, url: req.url }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'API server started');
});
