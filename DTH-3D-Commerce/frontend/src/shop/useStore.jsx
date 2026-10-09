import useNVXSelection from './garage/useNVXSelection';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FLOW, currentUser, loadCatalog, logout as apiLogout } from './api';
import { SupportProvider } from './support/SupportProvider';
import { useAppReadiness } from '../experience/loader/useAppReadiness';
import SupportWidget from './support/SupportWidget';
import { useCartState } from './cart/useCartState';
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
  const catalogEpoch = useRef(0);
  const getCatalogEpoch = useCallback(() => catalogEpoch.current, []);
  const [data, setData] = useState({ products: [], vehicles: [] });
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  useAppReadiness(loading, error);
  const { bag, setBag, getBagSnapshot, cartRequest, openCart, closeCart, addToBag, changeBagQuantity, adjustBagQuantity, removeBagLine } = useCartState(readCart);
  const [vehicleId, setVehicle] = useState(() => { const id = safeRead(VEHICLE_KEY, ''); return typeof id === 'string' ? id : ''; });
  const [user, setUserState] = useState(null), [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authRetry, setAuthRetry] = useState(0);
  const retrySession = useCallback(() => setAuthRetry(value => value + 1), []);
  const [notice, setNotice] = useState(''), [lastOrder, setLastOrder] = useState(null);
  const userRef = useRef(null), authEpoch = useRef(0);
  const getIdentityEpoch = useCallback(() => authEpoch.current, []);
  const setUser = useCallback(next => {
    authEpoch.current += 1;
    const previous = userRef.current;
    userRef.current = next;
    setUserState(next);
    setAuthLoading(false);
    setAuthError('');
    if (previous?.id !== next?.id) {
      setLastOrder(null);
      closeCart();
      setVehicle(current => next?.savedVehicleId || (next && !previous ? current : ''));
      if (previous) setBag([]);
    }
  }, []);
  async function refresh() {
    const epoch = ++catalogEpoch.current;
    setLoading(true); setError('');
    try { const next = await loadCatalog(); if (epoch === catalogEpoch.current) setData(next); }
    catch (e) { if (epoch === catalogEpoch.current) setError(e.message); }
    finally { if (epoch === catalogEpoch.current) setLoading(false); }
  }
  useEffect(() => {
    let live = true;
    const epoch = ++catalogEpoch.current;
    const current = () => live && epoch === catalogEpoch.current;
    loadCatalog().then(d => current() && setData(d)).catch(e => current() && setError(e.message)).finally(() => current() && setLoading(false));
    return () => { live = false; catalogEpoch.current += 1; };
  }, []);
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
    if (loading || error) { setNotice('Wait for the catalog before adding a part.'); return false; }
    const result = addToBag(product, chosenVehicle, quantity, data);
    if (!result.ok) { setNotice(result.message); return false; }
    setNotice(`${result.name} added to your bag.`);
    return true;
  }
  useNVXSelection({ loading, error, data, vehicleId, setVehicle, setNotice, storageKey: VEHICLE_KEY });
  const value = useMemo(() => ({ data, loading, error, refresh, getCatalogEpoch, bag, setBag, getBagSnapshot, cartRequest, openCart, closeCart, changeBagQuantity, adjustBagQuantity, removeBagLine, vehicleId, setVehicle, user, setUser, getIdentityEpoch, authLoading, authError, retrySession, add, notice, setNotice, lastOrder, setLastOrder, logout: async () => { await apiLogout(); setUser(null); setLastOrder(null); setBag([]); setVehicle(''); } }), [data, loading, error, bag, cartRequest, vehicleId, user, authLoading, authError, notice, lastOrder]);
  return <StoreContext.Provider value={value}><SupportProvider>{children}<SupportWidget/></SupportProvider></StoreContext.Provider>;
}
export function useStore() { const context = useContext(StoreContext); if (!context) throw new Error('Missing StoreProvider'); return context; }
