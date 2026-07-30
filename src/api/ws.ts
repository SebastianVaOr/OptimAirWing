type WsHandler = (data: unknown) => void;

const handlers = new Map<string, Set<WsHandler>>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let token: string | null = null;

export function connectWebSocket(authToken: string) {
  token = authToken;
  if (ws?.readyState === WebSocket.OPEN) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws?token=${authToken}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.event) {
        const eventHandlers = handlers.get(msg.event);
        eventHandlers?.forEach(h => h(msg.data));
      }
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    ws = null;
    reconnectTimer = setTimeout(() => token && connectWebSocket(token), 3000);
  };

  ws.onerror = () => ws?.close();
}

export function disconnectWebSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}

export function onWsEvent(event: string, handler: WsHandler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(handler);
  return () => handlers.get(event)?.delete(handler);
}
