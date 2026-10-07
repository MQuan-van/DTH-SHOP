import { createGarageService } from './service.mjs';
import { vehiclePreference } from '../../../shared/account.mjs';
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

export function installGarage(router, { User, Vehicle, authenticated, writeLimit }) {
  const service = createGarageService({ User, Vehicle });
  router.get('/account/garage', authenticated, asyncRoute(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await service.read(req.auth.user._id));
  }));
  router.post('/account/garage', authenticated, writeLimit, asyncRoute(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await service.mutate(req.auth.user._id, req.body));
  }));
  router.put('/account/vehicle', authenticated, writeLimit, asyncRoute(async (req, res) => {
    res.json(await service.saveLegacy(req.auth.user._id, vehiclePreference(req.body)));
  }));
}
