import { InputError } from './domain.mjs';

const text = (value, label, min, max, { lower = false, optional = false } = {}) => {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string') throw new InputError(`Enter a valid ${label}.`);
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length < min || clean.length > max) throw new InputError(`Enter a valid ${label}.`);
  return lower ? clean.toLowerCase() : clean;
};

export const CHECKOUT_LIMITS = Object.freeze({
  recipientName: 80,
  phone: 24,
  email: 120,
  addressLine: 180,
  city: 80,
  note: 300,
});

/**
 * Checkout details for the demonstrator only. This intentionally does not accept
 * card numbers or any other payment credential.
 */
export function normalizeCheckoutDetails(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Enter the demo delivery details.');
  const recipientName = text(body.recipientName, 'recipient name', 2, CHECKOUT_LIMITS.recipientName);
  const phone = text(body.phone, 'phone number', 7, CHECKOUT_LIMITS.phone);
  if (!/^[+()0-9 .-]+$/.test(phone) || !/[0-9]{7}/.test(phone.replace(/\D/g, ''))) throw new InputError('Enter a valid phone number.');
  const email = text(body.email, 'email', 3, CHECKOUT_LIMITS.email, { lower: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError('Enter a valid email.');
  const addressLine = text(body.addressLine, 'delivery address', 5, CHECKOUT_LIMITS.addressLine);
  const city = text(body.city, 'city', 2, CHECKOUT_LIMITS.city);
  const note = text(body.note, 'order note', 0, CHECKOUT_LIMITS.note, { optional: true });
  if (body.fulfillment !== 'demo-delivery') throw new InputError('Choose the demo delivery option.');
  if (body.paymentMethod !== 'demo-cod') throw new InputError('Choose the simulated pay-on-delivery option.');
  return {
    recipientName, phone, email, addressLine, city, note,
    fulfillment: 'demo-delivery', paymentMethod: 'demo-cod', demoOnly: true,
  };
}

export function checkoutLabel(checkout) {
  const value = normalizeCheckoutDetails(checkout);
  return `${value.recipientName} · ${value.city}`;
}
