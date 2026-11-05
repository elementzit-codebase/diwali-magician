
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createApp } from './app.js';
import { config } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const frontendDir = path.resolve(rootDir, 'frontend');

async function startServer() {
  const app = createApp();
  const PORT = config.port;

  if (!config.isProduction) {
    // DEVELOPMENT MODE: Mount Vite in middleware mode on Express
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(frontendDir, 'vite.config.js'),
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    // Vite handles client assets & HMR
    app.use(vite.middlewares);

    // Development SPA fallback: transform and serve index.html via Vite
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }

      try {
        const templatePath = path.resolve(frontendDir, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });
  } else {
    // PRODUCTION MODE: Serve compiled static files from frontend/dist
    const distPath = path.resolve(frontendDir, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Final 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SinglePortServer] Running in ${config.env.toUpperCase()} mode`);
    console.log(`[SinglePortServer] Accessible at http://localhost:${PORT}/`);
    console.log(`[SinglePortServer] API mounted at http://localhost:${PORT}/api/`);
  });

  return { app, server };
}

// Auto-start when executed directly via node backend/src/server.js
if (process.env.NODE_ENV !== 'test' && process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer().catch((err) => {
    console.error('[SinglePortServer] Failed to start:', err);
    process.exit(1);
  });
}

export { startServer };
