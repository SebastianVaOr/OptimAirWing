import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken } from '../middleware/auth';
import { logger } from './logger';

interface WsClient {
  ws: WebSocket;
  orgId: string;
}

const clients = new Map<string, WsClient[]>();

export function initWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close(4001, 'Token requerido');
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      ws.close(4001, 'Token inválido');
      return;
    }

    const client: WsClient = { ws, orgId: payload.orgId };
    const existing = clients.get(payload.orgId) || [];
    existing.push(client);
    clients.set(payload.orgId, existing);

    logger.info({ orgId: payload.orgId }, 'Cliente WebSocket conectado');

    ws.on('close', () => {
      const list = clients.get(payload.orgId) || [];
      clients.set(payload.orgId, list.filter(c => c.ws !== ws));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed messages
      }
    });
  });

  return wss;
}

export function broadcastToOrg(orgId: string, event: string, data: unknown) {
  const list = clients.get(orgId) || [];
  const msg = JSON.stringify({ event, data });
  list.forEach(c => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  });
}
