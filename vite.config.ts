import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wayfinding-local-persistence',
      configureServer(server) {
        server.middlewares.use('/api/save-data', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const targetPath = path.resolve(__dirname, 'src/data/wayfindingData.json');
                fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: String(err) }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
});
