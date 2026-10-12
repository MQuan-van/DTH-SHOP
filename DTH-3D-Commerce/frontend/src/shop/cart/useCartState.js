import { useCallback, useRef, useState } from 'react';
import { createCartState } from './cartState.mjs';

export function useCartState(initializer) {
  const ref = useRef(null);
  if (!ref.current) ref.current = createCartState(initializer());
  const [bag, setSnapshot] = useState(() => ref.current.read());
  const [cartRequest, setRequest] = useState(null);
  const sequence = useRef(0);
  const setBag = useCallback(next => setSnapshot(ref.current.replace(next)), []);
  const getBagSnapshot = useCallback(() => ref.current.getSnapshot(), []);
  const closeCart = useCallback(() => setRequest(null), []);
  const openCart = useCallback((trigger, added = null) => {
    const source = trigger || (typeof document === 'undefined' ? null : document.activeElement);
    setRequest({ id: ++sequence.current, added, trigger: source, motion: (source?.closest?.('[data-motion]') || (typeof document !== 'undefined' && document.querySelector('#dth-content [data-motion]')))?.dataset?.motion !== 'off' });
  }, []);
  const addToBag = useCallback((product, vehicleId, quantity, data) => {
    const result = ref.current.add(product?.id, vehicleId, quantity, data);
    if (result.ok) { setSnapshot(result.bag); openCart(null, { key: result.key, quantity: result.quantity, name: result.name }); }
    return result;
  }, [openCart]);
  const changeBagQuantity = useCallback((id, vehicleId, quantity, data) => {
    const result = ref.current.quantity(id, vehicleId, quantity, data);
    if (result.ok) setSnapshot(result.bag);
    return result;
  }, []);
  const adjustBagQuantity = useCallback((id, vehicleId, delta, data) => {
    const row = ref.current.read().find(i => i.productId === id && i.vehicleId === vehicleId);
    if (!row || ![-1, 1].includes(delta)) return { ok: false, message: 'Unable to change this bag line.' };
    const result = ref.current.quantity(id, vehicleId, row.quantity + delta, data);
    if (result.ok) setSnapshot(result.bag);
    return result;
  }, []);
  const removeBagLine = useCallback((id, vehicleId) => {
    const result = ref.current.remove(id, vehicleId);
    if (result.ok) setSnapshot(result.bag);
    return result;
  }, []);
  return { bag, setBag, getBagSnapshot, cartRequest, openCart, closeCart, addToBag, changeBagQuantity, adjustBagQuantity, removeBagLine };
}
