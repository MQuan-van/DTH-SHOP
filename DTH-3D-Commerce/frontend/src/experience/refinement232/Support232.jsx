import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import { MODE, studioRequest } from '../../shop/api';
import { useSupport } from '../../shop/support/SupportProvider';
import ChatThread from '../../shop/support/ChatThread';
import Modal232 from './Modal232';
import { supportMode232 } from './refinement232.logic.mjs';
import '../../shop/support/support.css';
import './refinement232.css';
const ChatIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-3 2V11a9 9 0 0 1 18 0Z"/><path d="M7 9h8M7 13h5"/></svg>;
export default function Support232() {
  const store = useStore(), support = useSupport(), location = useLocation(), trigger = useRef(null);
  const [open, setOpen] = useState(false), [thread, setThread] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const mode = supportMode232(MODE, store.user), owner = store.user?.id || '', ownerKey = `${owner}:${store.user?.role || ''}`;
  const id = thread?.ownerKey === ownerKey ? thread.id : '';
  useEffect(() => { setOpen(false); setThread(null); setError(''); }, [ownerKey]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open || mode !== 'customer') return;
    let alive = true; setError('');
    studioRequest('/chat/conversations', { method: 'POST', body: '{}' }).then(result => {
      if (!alive) return;
      if (typeof result?.data?.id !== 'string' || !result.data.id) throw new Error('The conversation could not be opened. Please retry.');
      setThread({ ownerKey, id: result.data.id }); support.refresh();
    }).catch(e => { if (alive) setError(e.message || 'Support is unavailable. Please retry.'); });
    return () => { alive = false; };
  }, [open, mode, ownerKey, retry, support.refresh]);
  if (location.pathname.startsWith('/admin')) return null;
  const unread = (support.conversations || []).reduce((sum, c) => sum + (Number.isSafeInteger(c.unread) && c.unread > 0 ? c.unread : 0), 0);
  const badge = unread > 0 ? <b aria-label={`${unread} unread messages`}>{Math.min(unread, 99)}{unread > 99 ? '+' : ''}</b> : null;
  const vehicle = store.data.vehicles.find(v => v.id === store.vehicleId);
  const tools = ({ draft, disabled, onInsert }) => !draft ? <div className="r232-chat-topics" aria-label="Message starters">
    <button type="button" disabled={disabled} onClick={() => onInsert(vehicle ? `Hello, I would like help checking parts for ${vehicle.make || 'Yamaha'} ${vehicle.model}.` : 'Hello, I would like help choosing parts for my NVX.')}>Compatibility</button>
    <button type="button" disabled={disabled} onClick={() => onInsert('Hello, I have a question about a product.')}>Product question</button>
  </div> : null;
  return <div className="dth-support-widget r232-support-widget">
    {mode === 'admin' ? <Link to="/admin/inbox" className="r232-support-trigger" aria-label="Open customer support inbox"><ChatIcon/><span>Inbox</span>{badge}</Link> : <button ref={trigger} type="button" className="r232-support-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><ChatIcon/><span>Support</span>{badge}</button>}
    {open && mode !== 'admin' && <Modal232 title="DTH support" label="Close support" onDismiss={() => setOpen(false)} returnTo={trigger.current} className="dth-support-panel r232-support-panel">
      {mode === 'preview' ? <div className="r232-support-state"><ChatIcon/><h3>Connect support</h3><p>This preview cannot send messages. Start the backend in API mode to use customer support.</p></div>
        : mode === 'guest' ? <div className="r232-support-state"><ChatIcon/><h3>Keep your conversation</h3><p>Sign in to ask a question and keep your message history.</p><Link className="r232-action" to="/account" onClick={() => setOpen(false)}>Sign in</Link></div>
        : error && !id ? <div className="r232-support-state"><h3>Connection unavailable</h3><p role="alert">{error}</p><button type="button" className="r232-action" onClick={() => setRetry(n => n + 1)}>Try again</button></div>
        : id ? <ChatThread key={`${ownerKey}:${id}`} conversationId={id} composerTools={tools}/>
        : <div className="r232-support-state" role="status"><span className="r232-loading"/>Opening your conversation…</div>}
    </Modal232>}
  </div>;
}
