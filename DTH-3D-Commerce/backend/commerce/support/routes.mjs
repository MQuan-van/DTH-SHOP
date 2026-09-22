import express from 'express';
import { randomUUID } from 'node:crypto';
import { InputError } from '../../../shared/domain.mjs';
import { CHAT_LIMITS, chatId, messageInput, pageNumber, sequence, searchText, literalPattern } from '../../../shared/support.mjs';
import { User, Order, Vehicle } from '../models.mjs';
import { digest } from '../security.mjs';
import { Conversation, Message, messageView } from './models.mjs';
import { normalizeChatImage } from './images.mjs';
import { createSupportHub } from './hub.mjs';
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const isChatMessageRequest = req => req.method === 'POST' && /^\/api\/shop\/chat\/conversations\/[a-f0-9-]{36}\/messages\/?$/i.test(req.path);
export function installSupport(router, { authenticated, admin, sessionFor, origins }) {
  const hub = createSupportHub(sessionFor), queues = new Map(), rates = new Map();
  let bodies = 0;
  function limit(max, period, suffix) {
    return (req, res, next) => {
      const now = Date.now(), key = `${req.auth.user._id}:${suffix}`;
      for (const [k,v] of rates) if (v.until <= now) rates.delete(k);
      const value = rates.get(key) || { n: 0, until: now + period }; value.n++; rates.set(key, value);
      if (value.n > max) { res.set('Retry-After', String(Math.ceil((value.until-now)/1000))); return res.status(429).json({ message: 'Too many chat requests. Please wait and retry.' }); }
      next();
    };
  }
  const writes = limit(60,60000,'write'), typingLimit = limit(80,60000,'typing');
  function bodySlot(req,res,next) {
    if (bodies >= 4) return res.status(429).json({ message: 'Chat is busy. Please retry shortly.' });
    bodies++; let released = false;
    const release = () => { if (!released) { released=true; bodies--; } };
    res.once('finish',release); res.once('close',release); next();
  }
  async function serial(id, task) {
    const previous = queues.get(id) || Promise.resolve();
    const current = previous.catch(()=>{}).then(task); queues.set(id,current);
    try { return await current; } finally { if (queues.get(id)===current) queues.delete(id); }
  }
  async function access(req) {
    const id = chatId(req.params.id);
    const c = await Conversation.findOne({ id, ...(req.auth.user.role==='admin'?{}:{customerId:req.auth.user._id}) }).lean();
    if (!c || !await User.exists({_id:c.customerId,disabled:false})) throw new InputError('Conversation not found.',404);
    return c;
  }
  async function view(c, role) {
    const [user, unread] = await Promise.all([
      User.findById(c.customerId).select('email savedVehicleId').lean(),
      Message.countDocuments({conversationId:c.id, senderRole:role==='admin'?'customer':'admin',seq:{$gt:role==='admin'?c.staffReadSeq:c.customerReadSeq}}),
    ]);
    return {id:c.id,status:c.status,customerReadSeq:c.customerReadSeq,staffReadSeq:c.staffReadSeq,lastMessageSeq:c.lastMessageSeq,
      lastPreview:c.lastPreview,lastMessageAt:c.lastMessageAt,updatedAt:c.updatedAt,unread,
      ...(role==='admin'?{customer:{id:String(c.customerId),email:user?.email||'Deleted account',savedVehicleId:user?.savedVehicleId||''}}:{})};
  }
  router.get('/chat/events', authenticated, (req,res) => {
    if ((req.headers.origin && !origins.has(req.headers.origin)) || req.headers['sec-fetch-site']==='cross-site') return res.status(403).json({message:'Untrusted stream origin.'});
    hub.connect(req,res);
  });
  router.get('/chat/conversations', authenticated, asyncRoute(async(req,res)=>{
    const role=req.auth.user.role, page=pageNumber(req.query.page), q=searchText(req.query.q);
    const query=role==='admin'?{}:{customerId:req.auth.user._id};
    if (role==='admin' && req.query.status) { if(!['open','resolved'].includes(req.query.status)) throw new InputError('Invalid status.'); query.status=req.query.status; }
    if(role==='admin' && q){ const users=await User.find({email:{$regex:literalPattern(q),$options:'i'}}).select('_id').limit(100).lean(); query.customerId={$in:users.map(u=>u._id)}; }
    const [total,rows]=await Promise.all([Conversation.countDocuments(query),Conversation.find(query).sort({lastMessageAt:-1,updatedAt:-1,_id:-1}).skip((page-1)*30).limit(30).lean()]);
    res.json({data:await Promise.all(rows.map(c=>view(c,role))),total,page,pageSize:30});
  }));
  router.post('/chat/conversations',authenticated,writes,asyncRoute(async(req,res)=>{
    if(req.auth.user.role==='admin') throw new InputError('Select a customer conversation from Inbox.',403);
    let c;
    try { c=await Conversation.findOneAndUpdate({customerId:req.auth.user._id},{$setOnInsert:{id:randomUUID(),status:'open'}},{upsert:true,new:true,setDefaultsOnInsert:true}).lean(); }
    catch(e){if(e.code!==11000)throw e;c=await Conversation.findOne({customerId:req.auth.user._id}).lean();}
    res.json({data:await view(c,req.auth.user.role)}); void hub.publish(c.customerId,'change',{conversationId:c.id});
  }));
  router.get('/chat/conversations/:id/messages',authenticated,asyncRoute(async(req,res)=>{
    const c=await access(req),query={conversationId:c.id};
    if(req.query.before!==undefined && req.query.after!==undefined) throw new InputError('Use one message cursor.');
    const after=req.query.after===undefined?null:sequence(Number(req.query.after));
    const before=req.query.before===undefined?null:sequence(Number(req.query.before));
    if(after!==null) query.seq={$gt:after}; else if(before!==null) query.seq={$lt:before};
    const rows=await Message.find(query).sort({seq:after!==null?1:-1}).limit(CHAT_LIMITS.pageSize+1).lean();
    const hasMore=rows.length>CHAT_LIMITS.pageSize,items=rows.slice(0,CHAT_LIMITS.pageSize);
    if(after===null) items.reverse();
    res.json({data:items.map(messageView),conversation:await view(c,req.auth.user.role),hasMore});
  }));
  router.post('/chat/conversations/:id/messages',authenticated,writes,bodySlot,express.json({limit:'7mb'}),asyncRoute(async(req,res)=>{
    const c=await access(req),input=messageInput(req.body),senderId=req.auth.user._id,senderRole=req.auth.user.role;
    const requestHash=digest(JSON.stringify({text:input.text,image:input.image}));
    const key={conversationId:c.id,senderId,clientId:input.clientId};
    async function existing(){const old=await Message.findOne(key).select('+requestHash').lean();if(old && old.requestHash!==requestHash)throw new InputError('This send key belongs to a different message.',409);return old;}
    const old=await existing(); if(old)return res.json({data:messageView(old)});
    const today=new Date(Date.now()-86400000);
    if(await Message.countDocuments({senderId,createdAt:{$gte:today}})>=1000)throw new InputError('Daily demo message limit reached.',429);
    if(input.image && await Message.countDocuments({senderId,createdAt:{$gte:today},'image.mime':{$exists:true}})>=50)throw new InputError('Daily demo image limit reached.',429);
    const image=await normalizeChatImage(input.image);
    const result=await serial(c.id,async()=>{
      const duplicate=await existing();if(duplicate)return duplicate;
      // Re-check ownership/session after potentially expensive decoding.
      const auth=await sessionFor(req);if(!auth || String(auth.user._id)!==String(senderId) || auth.user.role!==senderRole)throw new InputError('Please sign in again.',401);
      await access(req);
      const allocated=await Conversation.findOneAndUpdate({id:c.id},{$inc:{nextSeq:1}},{new:true}).lean();
      if(!allocated)throw new InputError('Conversation not found.',404);
      const saved=await Message.create({...key,id:randomUUID(),senderRole,requestHash,seq:allocated.nextSeq,text:input.text,...(image?{image}:{})});
      await Conversation.updateOne({id:c.id,lastMessageSeq:{$lt:saved.seq}},{$set:{status:'open',lastMessageSeq:saved.seq,lastMessageAt:saved.createdAt,lastPreview:input.text.slice(0,140)||(image?'Image':'')}});
      return saved;
    });
    res.status(201).json({data:messageView(result)});
    void hub.publish(c.customerId,'change',{conversationId:c.id});
    void hub.publish(c.customerId,'typing',{conversationId:c.id,role:senderRole,active:false});
  }));
  router.get('/chat/conversations/:id/messages/:messageId/image',authenticated,asyncRoute(async(req,res)=>{
    const c=await access(req),id=chatId(req.params.messageId);
    const m=await Message.findOne({id,conversationId:c.id}).select('+image.data').lean();
    if(!m?.image?.data)throw new InputError('Image not found.',404);
    const data=Buffer.isBuffer(m.image.data)?m.image.data:Buffer.from(m.image.data.buffer);
    res.set({'Content-Type':'image/webp','Content-Disposition':'inline; filename="support-image.webp"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}).send(data);
  }));
  router.post('/chat/conversations/:id/read',authenticated,typingLimit,asyncRoute(async(req,res)=>{
    const c=await access(req),read=sequence(req.body?.seq),field=req.auth.user.role==='admin'?'staffReadSeq':'customerReadSeq';
    if(read>c.lastMessageSeq)throw new InputError('Read position is beyond the conversation.');
    if(read>c[field]) {await Conversation.updateOne({id:c.id},{$max:{[field]:read}},{timestamps:false});void hub.publish(c.customerId,'change',{conversationId:c.id});}
    res.json({success:true});
  }));
  router.post('/chat/conversations/:id/typing',authenticated,typingLimit,asyncRoute(async(req,res)=>{
    const c=await access(req);if(typeof req.body?.active!=='boolean')throw new InputError('Invalid typing state.');
    res.json({success:true});void hub.publish(c.customerId,'typing',{conversationId:c.id,role:req.auth.user.role,active:req.body.active});
  }));
  router.put('/chat/conversations/:id/status',authenticated,admin,writes,asyncRoute(async(req,res)=>{
    const c=await access(req);if(!['open','resolved'].includes(req.body?.status))throw new InputError('Invalid status.');
    await serial(c.id,()=>Conversation.updateOne({id:c.id},{$set:{status:req.body.status}}));
    res.json({success:true});void hub.publish(c.customerId,'change',{conversationId:c.id});
  }));
  router.get('/chat/conversations/:id/context',authenticated,admin,asyncRoute(async(req,res)=>{
    const c=await access(req),user=await User.findById(c.customerId).select('email savedVehicleId createdAt').lean();
    const [vehicle,orders]=await Promise.all([Vehicle.findOne({id:user.savedVehicleId}).select('-_id -__v').lean(),Order.find({userId:c.customerId}).sort({createdAt:-1}).limit(5).select('id total createdAt lines status').lean()]);
    res.json({data:{customer:{email:user.email,createdAt:user.createdAt},vehicle,orders:orders.map(o=>({id:o.id,total:o.total,createdAt:o.createdAt,status:o.status,lines:o.lines}))}});
  }));
  return hub;
}
