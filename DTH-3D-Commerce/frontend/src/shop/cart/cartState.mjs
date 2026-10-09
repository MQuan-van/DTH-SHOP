import { normalizeBag, addBagLine, changeBagQuantity, removeBagLine } from './cart.logic.mjs';
const snapshot = input => Object.freeze(normalizeBag(input).map(Object.freeze));

/** Synchronous event transaction buffer: two adds before a React render see each other's result. */
export function createCartState(initial) {
  let bag = snapshot(initial);
  let revision = 0;
  const replace = next => {
    const updated = snapshot(next);
    if (JSON.stringify(updated) !== JSON.stringify(bag)) revision += 1;
    bag = updated;
    return bag;
  };
  const transact = result => { if (result.ok) replace(result.bag); return { ...result, ...(result.ok ? { bag } : {}) }; };
  return {
    read: () => bag,
    getSnapshot: () => ({ bag, revision }),
    replace(next) { return replace(typeof next === 'function' ? next(bag) : next); },
    add: (id, vehicleId, quantity, data) => transact(addBagLine(bag, id, vehicleId, quantity, data)),
    quantity: (id, vehicleId, quantity, data) => transact(changeBagQuantity(bag, id, vehicleId, quantity, data)),
    remove: (id, vehicleId) => transact(removeBagLine(bag, id, vehicleId)),
  };
}
