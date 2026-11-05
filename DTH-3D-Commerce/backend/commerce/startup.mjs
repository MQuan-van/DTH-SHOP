import dns from 'node:dns';
import { isIP } from 'node:net';

// Explicit opt-in, applied before Atlas SRV/TXT resolution. Never changes OS DNS.
export function configureMongoDns(uri, setting, setServers = servers => dns.setServers(servers)) {
  if (!String(uri).startsWith('mongodb+srv://') || !setting?.trim()) return false;
  const servers = [...new Set(setting.split(',').map(value => value.trim()))];
  if (servers.some(value => !isIP(value))) {
    throw new Error('MONGO_DNS_SERVERS must contain only comma-separated DNS IP addresses.');
  }
  setServers(servers);
  return true;
}

// Log a stage/code and an actionable hint, never raw URI-bearing errors/stacks.
export function startupFailure(error, stage = 'startup') {
  const name = /^[A-Za-z][A-Za-z0-9]*$/.test(error?.name || '') ? error.name : 'Error';
  const code = /^[A-Za-z0-9_]+$/.test(String(error?.code ?? '')) ? String(error.code) : '';
  const phase = ['MongoDB connection', 'collection/index initialization', 'application initialization', 'HTTP listen'].includes(stage) ? stage : 'startup';
  const dnsFailure = /^query(?:Srv|Txt)/.test(String(error?.syscall || error?.message || ''));
  let hint = 'Check the environment settings for this startup stage.';
  if (dnsFailure) hint = 'Atlas DNS SRV/TXT lookup failed. Check system DNS or configure MONGO_DNS_SERVERS in backend/.env.';
  else if (code === 'EADDRINUSE') hint = 'The backend port is already in use. Reuse the running API or stop its terminal before starting another.';
  else if (code === '18' || error?.codeName === 'AuthenticationFailed') hint = 'MongoDB authentication failed. Check the Atlas database user/password and URI encoding.';
  else if (code === '85' || code === '86') hint = 'MongoDB index definitions conflict. Review the existing indexes; do not delete data to work around this error.';
  else if (name === 'MongoServerSelectionError' || name === 'MongooseServerSelectionError') hint = 'MongoDB is unreachable. Check Atlas IP Access List, network/TLS and cluster availability.';
  else if (code === 'ECONNREFUSED') hint = 'The configured service refused the connection. Check the MongoDB host and port.';
  else if (error?.message === 'Production requires explicit SHOP_ORIGINS.') hint = error.message;
  return `Startup failed during ${phase} (${name}${code ? `, ${code}` : ''}). ${hint}`;
}
