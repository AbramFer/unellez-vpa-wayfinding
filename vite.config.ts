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

        server.middlewares.use('/api/upload-media', (req, res, next) => {
          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', chunk => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            req.on('end', () => {
              try {
                const raw = Buffer.concat(chunks).toString('utf-8');
                const { fileName, dataUrl } = JSON.parse(raw);
                const matches = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                  throw new Error('Formato dataUrl inválido');
                }
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                const safeName = String(fileName || 'media.jpg')
                  .replace(/[^a-zA-Z0-9._-]/g, '_')
                  .toLowerCase();
                const finalName = `${Date.now()}-${safeName}`;
                const mediaDir = path.resolve(__dirname, 'public/media');
                if (!fs.existsSync(mediaDir)) {
                  fs.mkdirSync(mediaDir, { recursive: true });
                }
                fs.writeFileSync(path.join(mediaDir, finalName), buffer);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true, url: `/media/${finalName}` }));
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
