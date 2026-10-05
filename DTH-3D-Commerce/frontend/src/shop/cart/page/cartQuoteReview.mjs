import { normalizeItems } from '../../../../../shared/domain.mjs';
import { verifyCartQuoteResponse } from '../../../../../shared/cartQuoteResponse.mjs';
import { lineKey, CART_LIMITS } from '../cart.logic.mjs';
import { inspectCartPage, payloadSignature, rememberPrices, reviewedPriceChanges } from './cartPage.logic.mjs';

/** A complete response must describe exactly the requested product/vehicle pairs. */
export function validateCartQuote(quote, items, mode) {
  return verifyCartQuoteResponse(quote, items, mode ?? quote?.source);
}

/** Loaded business facts may be stale; malformed input must be fixed before requesting. */
export function canRequestCartQuote(state) {
  const payload = payloadSignature(state.bag);
  return !!payload && payload !== '[]' && !state.loading && !state.error && !state.orderPending;
}

/** Retain catalog imagery and selectors; returned names, money and statuses are authoritative. */
export function applyCartQuote(view, quote) {
  if (!quote) return view;
  const byKey = new Map(quote.lines.map(row => [lineKey(row.productId, row.vehicleId), row]));
  const lines = view.lines.map(row => {
    const checked = byKey.get(row.key);
    return { ...row, ...checked, match: checked.status, quoteSource: quote.source,
      canIncrease: checked.status === 'compatible' && checked.quantity < CART_LIMITS.quantity };
  });
  return { ...view, lines, quote, subtotal: quote.subtotal, blocked: !quote.valid, needsReview: !quote.valid,
    issueCount: lines.filter(row => row.status !== 'compatible').length };
}

/** Revisions catch A -> B -> A changes even when React batches away the intermediate render. */
export function cartReviewContext(state) {
  let catalog;
  try { catalog = JSON.stringify([state.data?.products, state.data?.vehicles]); } catch { catalog = 'invalid-catalog'; }
  return JSON.stringify([state.actor, state.identity ?? 0, state.bagRevision ?? 0,
    payloadSignature(state.bag), state.catalogEpoch ?? 0, catalog, !!state.loading, state.error || '']);
}
export const freshReviewSignature = (actor, identity, generation, quote) => quote?.valid
  ? JSON.stringify([actor, identity ?? 0, generation, quote.fingerprint]) : '';

const initialState = () => ({ quote: null, pending: false, reviewing: false, acknowledged: false,
  signature: '', generation: 0, context: '', error: '', notice: '', priceChanges: [] });

/**
 * Owns quote requests and acknowledgement as one state machine. Async callbacks
 * must pass both request order and live store revisions before changing it.
 */
export function createCartQuoteController({ getCurrent, requestQuote, onChange }) {
  let state = initialState(), context = null, actorIdentity = '', serial = 0, disposed = false, previousPrices = [];
  const publish = (patch, notify = true) => {
    state = { ...state, ...patch };
    if (notify && !disposed) onChange?.();
    return state;
  };
  function synchronize(notify = false) {
    const current = getCurrent(), next = cartReviewContext(current);
    const nextActor = JSON.stringify([current.actor, current.identity ?? 0]);
    if (next !== context) {
      const hadReview = !!state.quote || state.pending || state.reviewing;
      if (nextActor !== actorIdentity) previousPrices = [];
      actorIdentity = nextActor; context = next; serial += 1;
      publish({ ...initialState(), generation: serial, context,
        notice: hadReview ? 'Your bag, catalog or account changed. Review the current selection again.' : '' }, notify);
    }
    return current;
  }
  function invalidate(notice = 'Review the current selection again.', error = '') {
    if (disposed) return;
    synchronize(); serial += 1;
    publish({ ...initialState(), generation: serial, context, notice, error });
  }
  return {
    read() { if (!disposed) synchronize(); return state; },
    invalidate,
    dispose() { serial += 1; disposed = true; state = { ...initialState(), generation: serial }; context = null; previousPrices = []; },
    activate() { if (disposed) { disposed = false; synchronize(); onChange?.(); } },
    acknowledge(value) {
      if (disposed) return false;
      synchronize();
      if (!state.reviewing || !state.quote?.valid || state.pending) return false;
      publish({ acknowledged: !!value });
      return true;
    },
    async review() {
      if (disposed) return { ok: false, ignored: true };
      const current = synchronize(), localView = inspectCartPage(current.bag, current.data, current);
      if (!canRequestCartQuote(current)) return { ok: false, ignored: true };
      const items = normalizeItems(current.bag), requestContext = context, requestId = ++serial;
      const prices = [...new Map([...rememberPrices(localView), ...previousPrices].map(row => [row.key, row])).values()];
      publish({ ...initialState(), generation: requestId, context, pending: true,
        notice: 'Checking current prices and each line’s vehicle mapping…' });
      const isCurrent = () => {
        if (disposed) return false;
        synchronize(true);
        return serial === requestId && context === requestContext;
      };
      try {
        const response = await requestQuote(items);
        if (!isCurrent()) return { ok: false, ignored: true };
        const quote = validateCartQuote(response, items, current.mode);
        const checked = applyCartQuote(localView, quote);
        const priceChanges = reviewedPriceChanges(prices, checked);
        previousPrices = rememberPrices(checked);
        publish({ quote, pending: false, reviewing: quote.valid, acknowledged: false,
          signature: freshReviewSignature(current.actor, current.identity, requestId, quote), priceChanges,
          notice: quote.valid ? 'Current prices checked. Review every part, line vehicle and total before confirming.'
            : `${checked.issueCount} ${checked.issueCount === 1 ? 'line needs' : 'lines need'} attention. Fix the affected lines, or check again after the catalog is corrected.` });
        return { ok: quote.valid, quote };
      } catch (error) {
        if (!isCurrent()) return { ok: false, ignored: true };
        publish({ quote: null, pending: false, reviewing: false, acknowledged: false, signature: '',
          error: error.message || 'Could not check your bag. Your items have been kept. Please try again.', notice: '' });
        return { ok: false, error };
      }
    },
  };
}
