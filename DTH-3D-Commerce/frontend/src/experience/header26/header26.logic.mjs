import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { headerVehicle25 } from '../studio25Preview/header25.logic.mjs';

/** Leave the older Studio camera/shell implementations available for rollback. */
export function useStudioHeader26(pathname, search = '') {
  if (pathname !== '/') return false;
  return !['classic', 'precision'].includes(new URLSearchParams(search).get('studio'));
}
/** Keyboard-activated anchors produce a normal primary click; modifiers retain native navigation. */
export function shouldOpenCart26(event, pathname) {
  return !!event && event.button === 0 && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && pathname !== '/bag';
}
export function liveVehicle26(vehicle) {
  const base = headerVehicle25(vehicle);
  if (!base.selected) return base;
  const full = vehicleLabel(vehicle);
  return { ...base, label: full, accessibleLabel: `Change shopping vehicle: ${full}` };
}
