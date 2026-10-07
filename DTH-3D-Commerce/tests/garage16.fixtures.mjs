/** In-memory database doubles only. Each update checks the actual service filter. */
import { NVX_VEHICLES } from '../shared/nvx.mjs';
import { createGarageService } from '../backend/commerce/garage/service.mjs';
export function fixture(users = [{ _id:'a', email:'a@dth.test', role:'customer', disabled:false, savedVehicleId:'' }], vehicles = NVX_VEHICLES) {
  const rows = new Map(users.map(u => [String(u._id), structuredClone(u)]));
  const calls = [];
  const User = {
    findOne(filter) { calls.push({ read:filter }); return { lean: async () => {
      const doc=rows.get(String(filter._id)); return doc && !doc.disabled ? structuredClone(doc) : null;
    } }; },
    findOneAndUpdate(filter, update, options) { calls.push({ write:filter, update, options }); return { lean: async () => {
      const doc=rows.get(String(filter._id));
      if (!doc || doc.disabled) return null;
      const rev=doc.garageRevision;
      if (filter.$or ? !(rev === 0 || rev === undefined) : rev !== filter.garageRevision) return null;
      Object.assign(doc,structuredClone(update.$set)); return structuredClone(doc);
    } }; },
  };
  const Vehicle = { find(filter) { calls.push({ vehicles:filter }); return { select:() => ({ lean:async () => vehicles.filter(v=>filter.id.$in.includes(v.id)) }) }; } };
  return { rows,calls,User,Vehicle,service:createGarageService({User,Vehicle}) };
}
