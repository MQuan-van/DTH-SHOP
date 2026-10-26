/** UI receipt only; no authorization or database mutation. */
export function makeSaveReceipt21(product) {
  if (!product || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id || '') || typeof product.updatedAt !== 'string') return null;
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug || '') ? product.slug : product.id;
  return { id: product.id, slug, updatedAt: product.updatedAt, visible: product.active !== false };
}
export function receiptMatches21(receipt, product, dirty = false) {
  return !dirty && Boolean(receipt && product && receipt.id === product.id
    && typeof receipt.updatedAt === 'string' && receipt.updatedAt === product.updatedAt
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(receipt.slug || '')
    && receipt.visible === (product.active !== false));
}
