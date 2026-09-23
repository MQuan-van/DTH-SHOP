import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../useStore';
import { MODE, studioRequest, studioUrl } from '../api';
const Context = createContext(null);

export function SupportProvider({ children }) {
  const store = useStore();
  const listeners = useRef(new Set());
  const [status, setStatus] = useState('offline');
  const [revision, setRevision] = useState(0);
  const [conversations, setConversations] = useState([]);
  const active = MODE === 'api' && !!store.user && !store.authLoading;

  const subscribe = useCallback(fn => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);
  const refresh = useCallback(() => setRevision(n => n + 1), []);

  useEffect(() => {
    setConversations([]);
    setStatus(active ? 'connecting' : 'offline');
    if (!active) return;
    let live = true;
    let stream = null;
    let revoked = false;

    function notify(type, event) {
      if (!live) return;
      try {
        const data = JSON.parse(event.data);
        listeners.current.forEach(fn => fn(type, data));
      } catch { /* A malformed event is not a successful message. */ }
    }
    function disconnect() {
      stream?.close();
      stream = null;
    }
    function connect() {
      if (!live || revoked) return;
      disconnect();
      if (!navigator.onLine) {
        setStatus('reconnecting');
        return;
      }
      setStatus('connecting');
      const current = new EventSource(studioUrl('/chat/events'), { withCredentials: true });
      stream = current;
      const valid = () => live && stream === current;
      current.addEventListener('ready', () => {
        if (valid()) { setStatus('live'); refresh(); }
      });
      current.addEventListener('change', event => {
        if (valid()) { refresh(); notify('change', event); }
      });
      current.addEventListener('typing', event => {
        if (valid()) notify('typing', event);
      });
      current.addEventListener('session-ended', () => {
        if (!valid()) return;
        revoked = true;
        disconnect();
        setStatus('offline');
        store.setUser(null);
        store.setNotice('Your chat session ended. Please sign in again.');
      });
      current.onerror = () => {
        if (valid()) setStatus('reconnecting');
        // EventSource performs normal transport reconnection. The ready event
        // asks each open thread to reconcile messages from its MongoDB cursor.
      };
    }
    const offline = () => {
      disconnect();
      if (live) setStatus('reconnecting');
    };
    const online = () => connect();
    const focus = () => { if (!document.hidden) refresh(); };
    connect();
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      live = false;
      disconnect();
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [active, store.user?.id, store.user?.role, refresh, store.setUser]);

  useEffect(() => {
    if (!active) return;
    let live = true;
    const timer = setTimeout(() => {
      studioRequest('/chat/conversations').then(result => {
        if (live) setConversations(result.data);
      }).catch(() => {});
    }, 120);
    return () => { live = false; clearTimeout(timer); };
  }, [active, revision, store.user?.id]);

  const value = useMemo(() => ({ status, revision, conversations, subscribe, refresh, active }),
    [status, revision, conversations, subscribe, refresh, active]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSupport() {
  const value = useContext(Context);
  if (!value) throw new Error('SupportProvider is required.');
  return value;
}
