import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { configureMongoDns, startupFailure } from '../backend/commerce/startup.mjs';

test('DNS remains unchanged without explicit opt-in or for a standard/local URI', () => {
  const apply = () => assert.fail('DNS must not change');
  assert.equal(configureMongoDns('mongodb+srv://example.test/db', undefined, apply), false);
  assert.equal(configureMongoDns('mongodb+srv://example.test/db', '  ', apply), false);
  assert.equal(configureMongoDns('mongodb://127.0.0.1/db', '1.1.1.1', apply), false);
});

test('Atlas opt-in accepts IPv4/IPv6, trims and deduplicates servers', () => {
  let applied;
  assert.equal(configureMongoDns('mongodb+srv://example.test/db', ' 1.1.1.1,8.8.8.8,1.1.1.1,2606:4700:4700::1111 ', value => { applied = value; }), true);
  assert.deepEqual(applied, ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111']);
});

test('invalid DNS configuration fails before changing the resolver and never echoes supplied values', () => {
  for (const value of ['1.1.1.1,', 'secret@dns.example', 'https://1.1.1.1', '999.1.1.1']) {
    assert.throws(() => configureMongoDns('mongodb+srv://example.test/db', value, () => assert.fail('must validate first')), {
      message: 'MONGO_DNS_SERVERS must contain only comma-separated DNS IP addresses.',
    });
  }
});

test('real backend config applies the explicit resolver before a driver connects, with no network or DB writes', () => {
  const configUrl = new URL('../backend/commerce/config.mjs', import.meta.url).href;
  const script = `import ${JSON.stringify(configUrl)}; import dns from 'node:dns'; console.log(JSON.stringify(dns.getServers()));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', env: {...process.env, MONGO_URI:'mongodb+srv://example.test/db', MONGO_DNS_SERVERS:'1.1.1.1,8.8.8.8'},
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), ['1.1.1.1','8.8.8.8']);
});

test('SRV/TXT failure reports DNS with its real code rather than generic Mongo/port advice', () => {
  for (const syscall of ['querySrv', 'queryTxt']) {
    assert.match(startupFailure({name:'Error', code:'ECONNREFUSED', syscall}, 'MongoDB connection'), /MongoDB connection \(Error, ECONNREFUSED\).*DNS SRV\/TXT.*MONGO_DNS_SERVERS/);
  }
  assert.match(startupFailure({name:'Error', code:'ENOTFOUND', message:'querySrv ENOTFOUND example.test'}), /DNS SRV\/TXT/);
});

test('startup diagnostics do not disclose raw error messages, URIs or credentials', () => {
  const secret = 'mongodb+srv://private-user:private-password@example.test/db?token=private-token';
  const text = startupFailure({name:secret, code:secret, message:secret}, secret);
  assert.equal(text, 'Startup failed during startup (Error). Check the environment settings for this startup stage.');
  assert.doesNotMatch(text, /private-|mongodb|example\.test/);
});

test('listen/auth/index/production/selection failures have distinct safe hints', () => {
  assert.match(startupFailure({name:'Error',code:'EADDRINUSE'}, 'HTTP listen'), /HTTP listen.*port is already in use/);
  assert.match(startupFailure({name:'MongoServerError',code:18}), /authentication failed/);
  assert.match(startupFailure({name:'MongoServerError',code:85}, 'collection/index initialization'), /index definitions conflict/);
  assert.match(startupFailure({name:'Error',message:'Production requires explicit SHOP_ORIGINS.'}), /Production requires explicit SHOP_ORIGINS/);
  assert.match(startupFailure({name:'MongooseServerSelectionError'}), /IP Access List/);
  assert.match(startupFailure({name:'Error',code:'ECONNREFUSED'}), /host and port/);
});
