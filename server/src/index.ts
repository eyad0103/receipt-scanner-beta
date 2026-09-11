import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { receiptRouter } from './routes/receipts.js';
import { authRouter } from './routes/auth.js';
import { log } from './logging/index.js';
import { initDatabase } from './db/database.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb', verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

app.use('/api/receipts', receiptRouter);
app.use('/api/auth', authRouter);

app.get('/', (_req, res) => {
  res.json({ name: 'ReceiptFlow API', version: '1.0.0' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      status: 'failed',
      errors: ['File too large'],
    });
    return;
  }
  if (err.message?.includes('Unsupported file type')) {
    res.status(400).json({
      status: 'failed',
      errors: [err.message],
    });
    return;
  }
  log.error('Unhandled middleware error', err);
  res.status(500).json({
    status: 'failed',
    errors: ['Internal server error'],
  });
});

async function startServer() {
  try {
    await initDatabase();
    log.info('Database initialized successfully');

    app.listen(config.port, config.host, () => {
      log.info(`ReceiptFlow API running on http://${config.host}:${config.port}`);
    });
  } catch (err) {
    log.error('Failed to start server', err);
    process.exit(1);
  }
}

startServer();
