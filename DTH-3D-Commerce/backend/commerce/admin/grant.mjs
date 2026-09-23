import '../config.mjs';
import mongoose from 'mongoose';
import { mongoUri } from '../config.mjs';
import { User, Session } from '../models.mjs';
// Explicit local operator action; public registration never accepts an admin role.
const email=String(process.argv[2]||'').trim().toLowerCase();
try {
  if(!email || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Usage: npm run admin:grant -- your-existing-test-email');
  await mongoose.connect(mongoUri,{serverSelectionTimeoutMS:8000});
  const user=await User.findOne({email,disabled:false});
  if(!user)throw new Error('Register this account on the website first. No account was created or changed.');
  if(user.role!=='admin'){user.role='admin';await user.save();await Session.deleteMany({userId:user._id});}
  console.log('Admin role granted to the requested existing account. Sign out and sign in again. No catalog or order data was changed.');
} catch(e){console.error(e.message);process.exitCode=1;} finally{await mongoose.disconnect();}
