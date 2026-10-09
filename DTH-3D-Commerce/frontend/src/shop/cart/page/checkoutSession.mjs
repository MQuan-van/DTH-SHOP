import { normalizeItems } from '../../../../../shared/domain.mjs';
import { inspectCartPage, reviewSignature, payloadSignature } from './cartPage.logic.mjs';
import { cartReviewContext, freshReviewSignature, validateCartQuote } from './cartQuoteReview.mjs';

const storageKey = mode => `dth.${mode}.full-cart-intent.v1`;
const memory = new Map();
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(value);
export function getCartIntent(mode, fingerprint, { storage, uuid = () => globalThis.crypto.randomUUID() } = {}) {
  const key = storageKey(mode);
  let saved = memory.get(key);
  try { saved = JSON.parse(storage?.getItem(key) || 'null') || saved; } catch { /* memory fallback */ }
  if (saved?.fingerprint === fingerprint && validId(saved.id)) return saved;
  const id = uuid();
  if (!validId(id)) throw new Error('Open the demo on localhost or HTTPS before placing an order.');
  const next = { fingerprint, id };
  memory.set(key, next);
  try { storage?.setItem(key, JSON.stringify(next)); } catch { /* retry across reload needs storage */ }
  return next;
}
export function finishCartIntent(mode, id, storage) {
  const key = storageKey(mode);
  if (memory.get(key)?.id === id) memory.delete(key);
  try { if (JSON.parse(storage?.getItem(key) || 'null')?.id === id) storage.removeItem(key); } catch { /* do not turn an order success into failure */ }
}
export function createCheckoutController({ getCurrent, requestOrder, onPending, onSuccess, onFailure, storage, uuid }) {
  let pending = false, disposed = false;
  return {
    isPending: () => pending,
    dispose() { disposed = true; },
    async submit(acknowledgedSignature) {
      if (disposed || pending) return { ok: false, ignored: true };
      const state = getCurrent();
      let quote, signature;
      if (state.requireFreshQuote) {
        const review = state.review;
        if (!review?.reviewing || !review.acknowledged || review.pending || review.context !== cartReviewContext(state))
          return { ok: false, ignored: true };
        try { quote = validateCartQuote(review.quote, state.bag, state.mode); } catch { return { ok: false, ignored: true }; }
        signature = freshReviewSignature(state.actor, state.identity, review.generation, quote);
        if (review.signature !== signature) return { ok: false, ignored: true };
      } else {
        // Legacy callers keep the pre-13.2 controller contract; /bag always opts into fresh quotes.
        const view = inspectCartPage(state.bag, state.data, state);
        quote = view.quote; signature = reviewSignature(state.actor, view);
      }
      if (!signature || signature !== acknowledgedSignature || !state.canSubmit) return { ok: false, ignored: true };
      pending = true; onPending?.(true);
      const stillCurrent = () => !disposed && getCurrent().actor === state.actor && getCurrent().identity === state.identity;
      try {
        const snapshot = normalizeItems(state.bag), payload = payloadSignature(snapshot);
        const intent = getCartIntent(state.mode, JSON.stringify([state.actor, payload]), { storage, uuid });
        const order = await requestOrder(snapshot, intent.id, true, state.data, quote.total,
          state.requireFreshQuote ? quote.fingerprint : undefined);
        if (!order || !validId(order.id) || !Array.isArray(order.lines) || !Number.isSafeInteger(order.total))
          throw new Error('Confirmation could not be verified. Keep this bag and retry, or check your account orders.');
        if (!stillCurrent()) return { ok: false, ignored: true };
        onSuccess(order, payload, state.bagRevision);
        finishCartIntent(state.mode, intent.id, storage);
        return { ok: true, order };
      } catch (error) {
        if (stillCurrent()) onFailure?.(error);
        return { ok: false, error };
      } finally {
        pending = false;
        if (stillCurrent()) onPending?.(false);
      }
    },
  };
}
