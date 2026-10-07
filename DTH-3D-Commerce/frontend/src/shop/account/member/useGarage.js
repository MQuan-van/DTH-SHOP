import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAccountGarage, updateAccountGarage } from '../../api';
import { useStore } from '../../useStore';
import { garageSnapshot } from '../../../../../shared/garage.mjs';
import { acceptGarageResponse } from './garageClient.mjs';

export default function useGarage() {
  const store = useStore(), latest = useRef(store); latest.current = store;
  const ownerId = store.user?.id;
  const live = useRef(false), sequence = useRef(0), writeLock = useRef(false);
  const [garage, setGarage] = useState(() => garageSnapshot(store.user || {}));
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const ready = useRef(false), stateRef = useRef(garage); stateRef.current = garage;
  const refresh = useCallback(async (preserveError = false) => {
    if (writeLock.current || !latest.current.user) return;
    const s = latest.current, epoch = s.getIdentityEpoch(), request = ++sequence.current, id = s.user.id;
    ready.current = false; setLoading(true); if (!preserveError) setError('');
    try {
      const result = await loadAccountGarage();
      if (!live.current) return;
      const accepted = acceptGarageResponse(result, { ownerId: id, epoch, currentEpoch: s.getIdentityEpoch(), request, currentRequest: sequence.current });
      if (!accepted) {
        if (request === sequence.current && latest.current.user?.id === id) setError('Account state changed. Refresh your garage.');
        return;
      }
      stateRef.current = accepted.garage; setGarage(accepted.garage);
      s.setUser(accepted.user); ready.current = true;
    } catch (e) {
      if (!live.current || request !== sequence.current || epoch !== s.getIdentityEpoch()) return;
      if (e.status === 401) { s.setUser(null); s.setNotice('Please sign in again.'); }
      else setError(e.message || 'Could not load your garage.');
    } finally { if (live.current && request === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => {
    live.current = true; void refresh();
    return () => { live.current = false; sequence.current++; };
  }, [ownerId, refresh]);
  useEffect(() => {
    // Reconcile when returning from another tab; do not interrupt an in-flight save.
    const reconcile = () => { if (!document.hidden && !writeLock.current) void refresh(); };
    document.addEventListener('visibilitychange', reconcile);
    return () => document.removeEventListener('visibilitychange', reconcile);
  }, [refresh]);
  const mutate = useCallback(async (action, vehicleId) => {
    if (writeLock.current || !ready.current || !latest.current.user) return false;
    const s = latest.current, epoch = s.getIdentityEpoch(), id = s.user.id, request = ++sequence.current;
    writeLock.current = true; setBusy(true); setError(''); setMessage('');
    let conflict = false;
    try {
      const result = await updateAccountGarage({ action, vehicleId, revision: stateRef.current.revision });
      if (!live.current) return false;
      const accepted = acceptGarageResponse(result, { ownerId: id, epoch, currentEpoch: s.getIdentityEpoch(), request, currentRequest: sequence.current });
      if (!accepted) {
        if (request === sequence.current && latest.current.user?.id === id) { ready.current = false; setError('Account state changed. Refresh your garage.'); }
        return false;
      }
      stateRef.current = accepted.garage; setGarage(accepted.garage); s.setUser(accepted.user);
      // Deliberately do not setVehicle/setBag: account default and shopping choice are separate.
      setMessage(action === 'add' ? 'Vehicle added.' : action === 'remove' ? 'Vehicle removed.' : 'Default updated.');
      return true;
    } catch (e) {
      if (!live.current || request !== sequence.current || epoch !== s.getIdentityEpoch()) return false;
      if (e.status === 401) { s.setUser(null); s.setNotice('Please sign in again.'); }
      else { setError(e.message || 'Could not save. Please try again.'); conflict = e.status === 409; }
      return false;
    } finally {
      writeLock.current = false;
      if (live.current && request === sequence.current) {
        setBusy(false);
        if (conflict) void refresh(true);
      }
    }
  }, [refresh]);
  return { garage, loading, busy, error, message, refresh, mutate };
}
