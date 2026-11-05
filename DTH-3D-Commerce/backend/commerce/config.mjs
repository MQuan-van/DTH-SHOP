import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { configureMongoDns } from './startup.mjs';
// Resolve against this module, not the terminal's working directory.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
export const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dth_3d_commerce';
configureMongoDns(mongoUri, process.env.MONGO_DNS_SERVERS);
