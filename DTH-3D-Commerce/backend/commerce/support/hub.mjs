import { CHAT_LIMITS } from '../../../shared/support.mjs';
/** Single-node transport adapter. Replace with a shared broker before horizontal scaling. */
export function createSupportHub(sessionFor) {
  const clients = new Set();
  function frame(res, event, data) {
    if (res.destroyed || res.writableEnded) return false;
    const ok = res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (!ok) res.end(); // Slow consumers reconnect and reconcile from MongoDB; do not buffer indefinitely.
    return ok;
  }
  function close(client) { clearInterval(client.timer); clients.delete(client); if (!client.res.writableEnded) client.res.end(); }
  async function verify(client) {
    const auth = await sessionFor(client.req);
    if (!auth || String(auth.user._id) !== client.userId || auth.user.role !== client.role) { frame(client.res, 'session-ended', {}); close(client); return false; }
    return true;
  }
  async function publish(customerId, event, data) {
    await Promise.allSettled([...clients].filter(c => c.role === 'admin' || c.userId === String(customerId)).map(async c => {
      try { if (await verify(c)) frame(c.res, event, data); } catch { close(c); }
    }));
  }
  function connect(req, res) {
    const userId = String(req.auth.user._id);
    if (clients.size >= 200 || [...clients].filter(c => c.userId === userId).length >= CHAT_LIMITS.connectionsPerUser) return res.status(429).json({ message: 'Too many live chat tabs. Close another tab and retry.' });
    res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
    res.flushHeaders(); res.write('retry: 2000\n\n');
    const client = { req, res, userId, role: req.auth.user.role, timer: null, checking: false };
    clients.add(client); frame(res, 'ready', { connected: true });
    client.timer = setInterval(async () => {
      if (client.checking) return;
      client.checking = true;
      try { if (await verify(client)) frame(res, 'heartbeat', {}); } catch { close(client); }
      finally { client.checking = false; }
    }, 10000);
    client.timer.unref?.(); res.on('close', () => close(client));
  }
  return { connect, publish, disconnectUser(userId) { for (const c of [...clients]) if (c.userId === String(userId)) { frame(c.res, 'session-ended', {}); close(c); } }, close() { for (const c of [...clients]) close(c); } };
}
