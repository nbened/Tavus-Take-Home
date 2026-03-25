// Global registry of active SSE clients (works in Next.js dev; for prod use Redis/Upstash)
type Controller = ReadableStreamDefaultController<Uint8Array>;

const clients = new Set<Controller>();

export function addClient(ctrl: Controller) {
  clients.add(ctrl);
}

export function removeClient(ctrl: Controller) {
  clients.delete(ctrl);
}

export function broadcast(event: string, data: unknown) {
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
