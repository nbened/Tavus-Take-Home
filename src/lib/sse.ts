// Global registry of active SSE clients (works in Next.js dev; for prod use Redis/Upstash)
type Controller = ReadableStreamDefaultController<Uint8Array>;

const g = global as typeof globalThis & { _sseClients?: Set<Controller> };
if (!g._sseClients) g._sseClients = new Set();
const clients = g._sseClients;

export function addClient(ctrl: Controller) {
  clients.add(ctrl);
}

export function removeClient(ctrl: Controller) {
  clients.delete(ctrl);
}

export function broadcast(event: string, data: unknown) {
  console.log(`[sse] broadcasting "${event}" to ${clients.size} client(s)`);
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);
  for (const ctrl of Array.from(clients)) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      clients.delete(ctrl);
    }
  }
}
