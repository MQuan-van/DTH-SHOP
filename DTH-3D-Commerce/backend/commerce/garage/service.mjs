import { NVX_IDS, nvxVehicleQuery, publishedNVXVehicles } from '../../../shared/nvx.mjs';
import { GarageError, garageSnapshot, garageEnvelope, garageFields, applyGarageCommand, applyLegacyVehicle, normalizeGarageCommand } from '../../../shared/garage.mjs';

/** Single-document compare-and-swap. Never accepts an owner ID from a request body. */
export function createGarageService({ User, Vehicle }) {
  async function readUser(ownerId) {
    const user = await User.findOne({ _id: ownerId, disabled: false }).lean();
    if (!user) throw new GarageError('Please sign in again.', 401);
    return user;
  }
  async function available() {
    const records = await Vehicle.find(nvxVehicleQuery()).select('id make model -_id').lean();
    return publishedNVXVehicles(records).map(v => v.id);
  }
  async function change(ownerId, transition) {
    const user = await readUser(ownerId), before = garageSnapshot(user);
    const next = await transition(user);
    // No-op retries do not increment the revision or write to MongoDB.
    if (next.revision === before.revision) return garageEnvelope(user);
    const filter = { _id: ownerId, disabled: false,
      ...(before.revision === 0
        ? { $or: [{ garageRevision: 0 }, { garageRevision: { $exists: false } }] }
        : { garageRevision: before.revision }) };
    const updated = await User.findOneAndUpdate(filter, { $set: garageFields(next) },
      { new: true, runValidators: true, upsert: false }).lean();
    if (!updated) throw new GarageError('Your garage changed in another tab. Refresh and try again.', 409);
    return garageEnvelope(updated);
  }
  return {
    read: async ownerId => garageEnvelope(await readUser(ownerId)),
    mutate: async (ownerId, body) => {
      const command = normalizeGarageCommand(body); // Validate BEFORE any query.
      return change(ownerId, async user => applyGarageCommand(user, command,
        ['add','set-default'].includes(command.action) ? await available() : NVX_IDS));
    },
    saveLegacy: async (ownerId, id) => {
      // Same invariant and CAS boundary as the new endpoint; no bypass writer.
      if (id !== '' && !NVX_IDS.includes(id)) throw new GarageError('Choose a Yamaha NVX version.');
      return change(ownerId, async user => applyLegacyVehicle(user, id, id ? await available() : NVX_IDS));
    },
  };
}
