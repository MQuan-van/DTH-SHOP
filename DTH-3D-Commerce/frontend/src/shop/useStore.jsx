import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentUser, loadCatalog, logout as apiLogout } from './api';
const StoreContext = createContext(null);
const CART_KEY = 'dth.commerce.bag.v1';
const VEHICLE_KEY = 'dth.commerce.vehicle.v1';
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
  const [user, setUser] = useState(null), [authLoading, setAuthLoading] = useState(true);
  const [notice, setNotice] = useState(''), [lastOrder, setLastOrder] = useState(null);
  async function refresh() {
    setLoading(true); setError('');
    try { setData(await loadCatalog()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { let live = true; loadCatalog().then(d => live && setData(d)).catch(e => live && setError(e.message)).finally(() => live && setLoading(false)); return () => { live = false; }; }, []);
  useEffect(() => { let live = true; currentUser().then(u => live && setUser(u)).catch(() => {}).finally(() => live && setAuthLoading(false)); return () => { live = false; }; }, []);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(bag)); } catch { /* Bag still works in memory. */ } }, [bag]);
  useEffect(() => { try { localStorage.setItem(VEHICLE_KEY, JSON.stringify(vehicleId)); } catch { /* Private browsing may restrict storage. */ } }, [vehicleId]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(t); }, [notice]);
  function add(product, chosenVehicle = vehicleId, quantity = 1) {
    if (!data.vehicles.some(v => v.id === chosenVehicle) || !product.vehicleIds?.includes(chosenVehicle)) {
      setNotice('Choose a matching demo vehicle before adding this part.'); return false;
    }
    const key = `${product.id}:${chosenVehicle}`;
    const existing = bag.find(i => `${i.productId}:${i.vehicleId}` === key);
    if ((!existing && bag.length >= 20) || (existing?.quantity || 0) + quantity > 10) { setNotice('Demo bag limit reached (20 lines, 10 per part/vehicle).'); return false; }
    setBag(items => existing ? items.map(i => `${i.productId}:${i.vehicleId}` === key ? { ...i, quantity: i.quantity + quantity } : i) : [...items, { productId: product.id, vehicleId: chosenVehicle, quantity }]);
    setNotice(`${product.name} added to your bag.`); return true;
  }
  const value = useMemo(() => ({ data, loading, error, refresh, bag, setBag, vehicleId, setVehicle, user, setUser, authLoading, add, notice, setNotice, lastOrder, setLastOrder, logout: async () => { await apiLogout(); setUser(null); setLastOrder(null); setBag([]); } }), [data, loading, error, bag, vehicleId, user, authLoading, notice, lastOrder]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { const context = useContext(StoreContext); if (!context) throw new Error('Missing StoreProvider'); return context; }
