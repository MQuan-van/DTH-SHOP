/** Opt-in LOCAL isolated MongoDB test. Never connects to the application database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NVX_VEHICLES, NVX_IDS } from '../shared/nvx.mjs';
import { createGarageService } from '../backend/commerce/garage/service.mjs';
const uri = process.env.GARAGE16_TEST_MONGO_URI;
test('real MongoDB: persistence + atomic garage conflict', { skip: !uri }, async () => {
  const address = new URL(uri);
  if (address.protocol !== 'mongodb:' || !['127.0.0.1','localhost'].includes(address.hostname)
    || address.pathname !== '/dth_garage16_test' || address.username || address.password || address.search) {
    throw new Error('Use only mongodb://127.0.0.1:27017/dth_garage16_test for this test. No app DB allowed.');
  }
  const { default: mongoose } = await import('mongoose');
  const { User: AppUser, Vehicle: AppVehicle } = await import('../backend/commerce/models.mjs');
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 4000 }).asPromise();
  const token=randomUUID().replaceAll('-','');
  const User=connection.model('Garage16TestUser', AppUser.schema.clone(), `garage16_users_${token}`);
  const Vehicle=connection.model('Garage16TestVehicle', AppVehicle.schema.clone(), `garage16_vehicles_${token}`);
  try {
    const service=createGarageService({User,Vehicle});
    await Vehicle.insertMany(NVX_VEHICLES);
    const a=await User.create({email:`${token}@dth.test`,passwordHash:'test-only-not-for-login',savedVehicleId:NVX_IDS[1]});
    assert.deepEqual((await service.read(a._id)).garage.vehicleIds,[NVX_IDS[1]]);
    await service.mutate(a._id,{action:'add',vehicleId:NVX_IDS[0],revision:0});
    assert.deepEqual((await service.read(a._id)).garage.vehicleIds,[NVX_IDS[1],NVX_IDS[0]]);
    const results=await Promise.allSettled([
      service.mutate(a._id,{action:'set-default',vehicleId:NVX_IDS[0],revision:1}),
      service.mutate(a._id,{action:'add',vehicleId:NVX_IDS[2],revision:1}),
    ]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
    assert.equal((await service.read(a._id)).garage.revision,2);
  } finally {
    // Only the two random test collections created above, in the guarded test DB.
    await Promise.allSettled([User.collection.drop(),Vehicle.collection.drop()]);
    await connection.close();
  }
});
