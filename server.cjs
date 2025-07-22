const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = 3000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    const ip = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const language = req.headers['accept-language'];

    try {
      await prisma.connectionLog.create({
        data: {
          ip,
          userAgent,
          language,
        },
      });
    } catch (error) {
      console.error('Failed to log connection:', error);
    }
    
    // Send the current connection count to the new client
    ws.send(JSON.stringify({ type: 'connections', count: wss.clients.size }));

    // Broadcast the updated connection count to all clients
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'connections', count: wss.clients.size }));
      }
    });

    ws.on('close', () => {
      // Broadcast the updated connection count to all clients
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({ type: 'connections', count: wss.clients.size }));
        }
      });
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
