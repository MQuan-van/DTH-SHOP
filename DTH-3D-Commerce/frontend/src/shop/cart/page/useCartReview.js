import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODE, PREVIEW, createOrder, requestCartQuote } from '../../api';
import { changeBagQuantity, removeBagLine } from '../cart.logic.mjs';
import { actorKey, inspectCartPage, payloadSignature, retargetCartLine } from './cartPage.logic.mjs';
import { applyCartQuote, canRequestCartQuote, createCartQuoteController } from './cartQuoteReview.mjs';
import { createCheckoutController } from './checkoutSession.mjs';

export function useCartReview(store) {
  const navigate = useNavigate();
  const [, render] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const session = useRef(null), quoteSession = useRef(null), latest = useRef(null);
  const actor = actorKey(MODE, store.user), identity = useRef({ actor, epoch: 0 });
  const catalog = useRef({ data: store.data, loading: store.loading, error: store.error, epoch: 0 });
  if (identity.current.actor !== actor) identity.current = { actor, epoch: identity.current.epoch + 1 };
  if (catalog.current.data !== store.data || catalog.current.loading !== store.loading || catalog.current.error !== store.error)
    catalog.current = { data: store.data, loading: store.loading, error: store.error, epoch: catalog.current.epoch + 1 };
  latest.current = { store, actor, identity: identity.current.epoch, catalogEpoch: catalog.current.epoch };

  function getCurrent() {
    const current = latest.current, snapshot = current.store.getBagSnapshot?.();
    return { ...current.store, bag: snapshot?.bag ?? current.store.bag, bagRevision: snapshot?.revision ?? 0,
      actor: current.actor, identity: current.store.getIdentityEpoch?.() ?? current.identity, mode: MODE,
      catalogEpoch: `${current.store.getCatalogEpoch?.() ?? 0}:${current.catalogEpoch}`,
      orderPending: !!session.current?.isPending() };
  }
  if (!quoteSession.current) quoteSession.current = createCartQuoteController({
    getCurrent, requestQuote: requestCartQuote, onChange: () => render(value => value + 1),
  });
  const checked = quoteSession.current.read(), current = getCurrent();
  const view = { ...applyCartQuote(inspectCartPage(current.bag, current.data, current), checked.quote), canReview: canRequestCartQuote(current) };

  useEffect(() => {
    const controller = quoteSession.current;
    controller.activate();
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    setError(''); setBusy(false);
    let storage;
    try { storage = window.sessionStorage; } catch { /* blocked storage uses in-memory intent */ }
    const controller = createCheckoutController({
      getCurrent() {
        const value = getCurrent();
        return { ...value, requireFreshQuote: true, review: quoteSession.current.read(),
          canSubmit: PREVIEW || (!value.authLoading && !value.authError && !!value.user) };
      },
      storage, requestOrder: createOrder, onPending: setBusy,
      onSuccess(order, payload, bagRevision) {
        const target = latest.current.store;
        const unchanged = bagRevision === undefined || target.getBagSnapshot?.().revision === bagRevision;
        target.setLastOrder(order);
        target.setBag(bag => unchanged && payloadSignature(bag) === payload ? [] : bag);
        navigate(`/order-complete?order=${encodeURIComponent(order.id)}`, { replace: true });
      },
      onFailure(e) {
        if (e.status === 409) {
          setError('');
          quoteSession.current.invalidate('The catalog changed. Check your bag again before placing the order.',
            e.message || 'The reviewed prices or vehicle mapping changed. Your bag has been kept.');
        } else setError(e.message || 'Could not confirm the order. Your bag has been kept.');
        if (e.status === 401) latest.current.store.setUser(null);
      },
    });
    session.current = controller;
    return () => { controller.dispose(); if (session.current === controller) session.current = null; };
  }, [actor, current.identity, navigate]);

  function mutate(operation, message) {
    if (session.current?.isPending()) return false;
    let result;
    const target = latest.current.store;
    // The store runs this updater once, synchronously, against its newest bag.
    target.setBag(bag => {
      result = operation(bag, target.data);
      return result.ok ? result.bag : bag;
    });
    if (!result?.ok) { setError(result?.message || 'Could not update your bag.'); return false; }
    setError(''); quoteSession.current.invalidate(message);
    return true;
  }
  function quantity(row, value) {
    return mutate((bag, data) => changeBagQuantity(bag, row.productId, row.vehicleId, value, data), `${row.name}: quantity updated. Review the new selection.`);
  }
  function adjust(row, delta) {
    if (![-1, 1].includes(delta)) return false;
    return mutate((bag, data) => {
      const found = bag.find(i => i.productId === row.productId && i.vehicleId === row.vehicleId);
      return found ? changeBagQuantity(bag, row.productId, row.vehicleId, found.quantity + delta, data)
        : { ok: false, message: 'This line no longer exists.' };
    }, `${row.name}: quantity updated. Review the new selection.`);
  }
  function remove(row) { return mutate(bag => removeBagLine(bag, row.productId, row.vehicleId), `${row.name} removed. Review the remaining selection.`); }
  function vehicle(row, next) {
    return mutate((bag, data) => retargetCartLine(bag, row.productId, row.vehicleId, next, data),
      `Vehicle updated for ${row.name}. Matching lines are combined; the header vehicle is unchanged.`);
  }
  function review() {
    if (session.current?.isPending() || quoteSession.current.read().pending) return false;
    setError('');
    return quoteSession.current.review();
  }
  function edit() {
    if (!session.current?.isPending()) { setError(''); quoteSession.current.invalidate('Bag editing enabled. Review again after making changes.'); }
  }
  function acknowledge(value) { if (!session.current?.isPending()) quoteSession.current.acknowledge(value); }
  function place() {
    const fresh = quoteSession.current.read();
    if (!fresh.reviewing || !fresh.acknowledged) return;
    return session.current?.submit(fresh.signature);
  }
  return { view, reviewing: checked.reviewing, acknowledged: checked.acknowledged, busy, quoting: checked.pending,
    quote: checked.quote, error: error || checked.error, notice: checked.notice, priceChanges: checked.priceChanges,
    quantity, adjust, remove, vehicle, review, edit, acknowledge, place };
}
