import { useEffect } from 'react';
import { isNVXId } from '../../../../shared/nvx.mjs';
/** Clear only a stale GLOBAL selection. Never retarget/remove a bag line or write the user document. */
export default function useNVXSelection({ loading, error, data, vehicleId, setVehicle, setNotice, storageKey }) {
  useEffect(() => {
    if (loading || error || !vehicleId || (isNVXId(vehicleId) && data.vehicles.some(v => v.id === vehicleId))) return;
    try {
      const backup = `${storageKey}.before-nvx-step15`;
      if (localStorage.getItem(backup) === null) localStorage.setItem(backup, JSON.stringify(vehicleId));
    } catch { /* Selection remains safe if storage is blocked. */ }
    setVehicle('');
    setNotice('Choose NVX V1, V2 or V3 for the new catalogue. Your existing bag has been kept for review.');
  }, [loading, error, data.vehicles, vehicleId, setVehicle, setNotice, storageKey]);
}
