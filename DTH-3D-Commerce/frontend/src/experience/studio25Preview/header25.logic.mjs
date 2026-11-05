/** Preview-only labels. No account identity, saved vehicle, cart or fitment mutations. */
const text = value => typeof value === 'string' ? value.trim() : '';
export function headerVehicle25(vehicle) {
  const model = text(vehicle?.model), make = text(vehicle?.make);
  const label = [make, model].filter(Boolean).join(' ');
  const selected = !!model;
  return {
    selected,
    label: selected ? label : 'Choose your NVX',
    compact: selected ? model : 'Your NVX',
    accessibleLabel: selected ? `Change shopping vehicle: ${label}` : 'Choose shopping vehicle',
  };
}
export const safeBagCount25 = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export const studioHref25 = value => value === '/studio-spatial-preview.html' ? value : '/';
