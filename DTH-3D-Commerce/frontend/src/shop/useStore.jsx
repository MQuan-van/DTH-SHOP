import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FLOW, currentUser, loadCatalog, logout as apiLogout } from './api';
const StoreContext = createContext(null);
const CART_KEY = FLOW ? 'dth.flow.bag.v1' : 'dth.commerce.bag.v1';
const VEHICLE_KEY = FLOW ? 'dth.flow.vehicle.v1' : 'dth.commerce.vehicle.v1';
function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function readCart() {
  const value = safeRead(CART_KEY, []);
  if (!Array.isArray(value)) return [];
  return value.filter(i => i && typeof i.productId === 'string' && typeof i.vehicleId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 10).slice(0, 20);
}
export function StoreProvider({ children }) {
  const [data, setData] = useState({ products: [], vehicles: [] });
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [bag, setBag] = useState(readCart);
  const [vehicleId, setVehicle] = useState(() => { const id = safeRead(VEHICLE_KEY, ''); return typeof id === 'string' ? id : ''; });
  const [user, setUserState] = useState(null), [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authRetry, setAuthRetry] = useState(0);
  const retrySession = useCallback(() => setAuthRetry(value => value + 1), []);
  const [notice, setNotice] = useState(''), [lastOrder, setLastOrder] = useState(null);
  const userRef = useRef(null), authEpoch = useRef(0);
  const setUser = useCallback(next => {
    authEpoch.current += 1;
    const previous = userRef.current;
    userRef.current = next;
    setUserState(next);
    setAuthLoading(false);
    setAuthError('');
    if (previous?.id !== next?.id) {
      setLastOrder(null);
      setVehicle(current => next?.savedVehicleId || (next && !previous ? current : ''));
      if (previous) setBag([]);
    }
  }, []);
  async function refresh() {
    setLoading(true); setError('');
    try { setData(await loadCatalog()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { let live = true; loadCatalog().then(d => live && setData(d)).catch(e => live && setError(e.message)).finally(() => live && setLoading(false)); return () => { live = false; }; }, []);
  useEffect(() => {
    let live = true;
    const epoch = authEpoch.current;
    setAuthLoading(true); setAuthError('');
    currentUser().then(u => {
      if (live && epoch === authEpoch.current) setUser(u);
    }).catch(e => { if (live && epoch === authEpoch.current) setAuthError(e.message); }).finally(() => { if (live) setAuthLoading(false); });
    return () => { live = false; };
  }, [setUser, authRetry]);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(bag)); } catch { } }, [bag]);
  useEffect(() => { try { localStorage.setItem(VEHICLE_KEY, JSON.stringify(vehicleId)); } catch { } }, [vehicleId]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(t); }, [notice]);
  function add(product, chosenVehicle = vehicleId, quantity = 1) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10 || product.active === false) {
      setNotice('Choose a quantity from 1 to 10.'); return false;
    }
    if (!data.vehicles.some(v => v.id === chosenVehicle) || !product.vehicleIds?.includes(chosenVehicle)) {
      setNotice('Choose a matching demo vehicle before adding this part.'); return false;
    }
    const key = `${product.id}:${chosenVehicle}`;
    const existing = bag.find(i => `${i.productId}:${i.vehicleId}` === key);
    if ((!existing && bag.length >= 20) || (existing?.quantity || 0) + quantity > 10) { setNotice('Demo bag limit reached (20 lines, 10 per part/vehicle).'); return false; }
    setBag(items => existing ? items.map(i => `${i.productId}:${i.vehicleId}` === key ? { ...i, quantity: i.quantity + quantity } : i) : [...items, { productId: product.id, vehicleId: chosenVehicle, quantity }]);
    setNotice(`${product.name} added to your bag.`); return true;
  }
  const value = useMemo(() => ({ data, loading, error, refresh, bag, setBag, vehicleId, setVehicle, user, setUser, authLoading, authError, retrySession, add, notice, setNotice, lastOrder, setLastOrder, logout: async () => { await apiLogout(); setUser(null); setLastOrder(null); setBag([]); setVehicle(''); } }), [data, loading, error, bag, vehicleId, user, authLoading, authError, notice, lastOrder]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { const context = useContext(StoreContext); if (!context) throw new Error('Missing StoreProvider'); return context; }
