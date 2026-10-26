/** Step 20.2 – explicit demo availability, never a real reservation/fulfilment promise. */
export const AVAILABILITY = Object.freeze(['demo', 'in_stock', 'preorder', 'out_of_stock']);
export function commerceAvailability(product, requested = 1) {
  const kind = AVAILABILITY.includes(product?.availabilityStatus) ? product.availabilityStatus : 'demo';
  const count = Number.isSafeInteger(product?.stockQty) && product.stockQty >= 0 ? product.stockQty : 0;
  const lead = Number.isSafeInteger(product?.leadTimeDays) && product.leadTimeDays >= 0 ? product.leadTimeDays : 0;
  if (kind === 'out_of_stock') return { kind, orderable: false, max: 0, label: 'Out of stock', detail: 'This variant is not available for orders.' };
  if (kind === 'in_stock') return { kind, orderable: count >= requested && count > 0, max: count,
    label: count > 0 ? 'In stock (demo)' : 'Temporarily out of stock', detail: `Indicative stock: ${count}. Placing a demo order does not reserve stock.` };
//   if (kind === 'preorder') return { kind, orderable: true, max: 10,
//     label: 'Pre-order (demo)', detail: lead ? `Estimated availability in 2 days. Subject to confirmation.
// Place Pre-order (Demo) ${lead} days.` : 'Estimated availability will be confirmed.' };

if (kind === 'preorder') {
  return {
    kind,
    orderable: true,
    max: 10,
    label: 'Pre-order (demo)',
    detail: lead > 0
      ? `Estimated availability in ${lead} ${lead === 1 ? 'day' : 'days'}. Subject to confirmation.`
      : 'Estimated availability will be confirmed.',
  };
}

  return { kind: 'demo', orderable: true, max: 10, label: 'Demo catalog', detail: 'Actual stock availability is not confirmed.' };
}
