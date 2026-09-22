import { Product, Vehicle, Order, User } from '../models.mjs';
import { Conversation } from '../support/models.mjs';
import { InputError, validateProduct } from '../../../shared/domain.mjs';
import { pageNumber, searchText, literalPattern } from '../../../shared/support.mjs';
const route = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const orderView = o => ({id:o.id,lines:o.lines,total:o.total,createdAt:o.createdAt,status:o.status,paymentStatus:o.paymentStatus,demoOnly:true});
function productRecord(body, previous, vehicles) {
  const clean=validateProduct({...previous,...body},vehicles);
  const text=(value,max,fallback)=>typeof value==='string' && value.length<=max?value.trim():fallback;
  if(body.accent!==undefined && !/^#[a-f0-9]{6}$/i.test(body.accent))throw new InputError('Use a six-digit hex accent colour.');
  if(body.assetLicense!==undefined && (typeof body.assetLicense!=='string'||body.assetLicense.length>500))throw new InputError('Asset provenance must be at most 500 characters.');
  const specs=body.specs ?? previous?.specs ?? {'Asset purpose':'Demonstration only'};
  if(!specs || typeof specs!=='object'||Array.isArray(specs)||Object.keys(specs).length>30||Object.entries(specs).some(([k,v])=>['__proto__','prototype','constructor'].includes(k)||!k.trim()||k.length>80||typeof v!=='string'||v.length>500))throw new InputError('Use up to 30 text specification fields.');
  return {...clean,accent:body.accent||previous?.accent||'#00c2ff',featured:body.featured===undefined?!!previous?.featured:body.featured===true,
    specs,assetLicense:text(body.assetLicense,500,previous?.assetLicense||'Provenance not provided')};
}
export function installAdmin(router,{authenticated,admin,writeLimit}) {
  const guard=[authenticated,admin];
  router.get('/admin/studio/overview',...guard,route(async(req,res)=>{
    const [products,active,vehicles,orders,openChats]=await Promise.all([Product.countDocuments(),Product.countDocuments({active:true}),Vehicle.countDocuments(),Order.countDocuments(),Conversation.countDocuments({status:'open'})]);
    res.json({data:{products,active,vehicles,orders,openChats}});
  }));
  router.get('/admin/studio/products',...guard,route(async(req,res)=>{
    const q=searchText(req.query.q),page=pageNumber(req.query.page),query={};
    if(q)query.$or=[{name:{$regex:literalPattern(q),$options:'i'}},{id:{$regex:literalPattern(q),$options:'i'}}];
    if(req.query.active){if(!['true','false'].includes(req.query.active))throw new InputError('Invalid visibility.');query.active=req.query.active==='true';}
    const [data,total]=await Promise.all([Product.find(query).sort({name:1,id:1}).skip((page-1)*12).limit(12).select('-_id -__v').lean(),Product.countDocuments(query)]);
    res.json({data,total,page,pageSize:12});
  }));
  router.get('/admin/studio/products/:id',...guard,route(async(req,res)=>{
    const data=await Product.findOne({id:req.params.id}).select('-_id -__v').lean();if(!data)throw new InputError('Product not found.',404);res.json({data});
  }));
  router.post('/admin/studio/products',...guard,writeLimit,route(async(req,res)=>{
    const record=productRecord(req.body,null,await Vehicle.find().lean());
    if(await Product.exists({$or:[{id:record.id},{slug:record.slug}]}))throw new InputError('This product ID is already in use.',409);
    const saved=await Product.create(record);const data=saved.toObject();delete data._id;delete data.__v;res.status(201).json({data});
  }));
  router.put('/admin/studio/products/:id',...guard,writeLimit,route(async(req,res)=>{
    const previous=await Product.findOne({id:req.params.id}).lean();if(!previous)throw new InputError('Product not found.',404);
    if(req.body.id!==previous.id)throw new InputError('The product ID cannot be changed.');
    if(typeof req.body.expectedUpdatedAt!=='string'||req.body.expectedUpdatedAt!==previous.updatedAt.toISOString())throw new InputError('This product changed elsewhere. Reload it before saving.',409);
    const record=productRecord(req.body,previous,await Vehicle.find().lean());
    const data=await Product.findOneAndUpdate({id:previous.id,updatedAt:previous.updatedAt},{$set:record},{new:true,runValidators:true}).select('-_id -__v').lean();
    if(!data)throw new InputError('Another editor saved first. Reload the product.',409);res.json({data});
  }));
  router.get('/admin/studio/vehicles',...guard,route(async(req,res)=>{
    const vehicles=await Vehicle.find().sort({make:1,model:1,year:1}).select('-_id -__v').lean();
    const data=await Promise.all(vehicles.map(async v=>({...v,products:await Product.countDocuments({vehicleIds:v.id})})));res.json({data});
  }));
  router.get('/admin/studio/orders',...guard,route(async(req,res)=>{
    const q=searchText(req.query.q),page=pageNumber(req.query.page),query=q?{$or:[{id:{$regex:literalPattern(q),$options:'i'}},{'lines.name':{$regex:literalPattern(q),$options:'i'}}]}:{};
    const [rows,total]=await Promise.all([Order.find(query).sort({createdAt:-1,_id:-1}).skip((page-1)*15).limit(15).lean(),Order.countDocuments(query)]);
    res.json({data:rows.map(orderView),total,page,pageSize:15});
  }));
  router.get('/admin/studio/orders/:id',...guard,route(async(req,res)=>{
    const order=await Order.findOne({id:req.params.id}).lean();if(!order)throw new InputError('Order not found.',404);
    const user=await User.findById(order.userId).select('email').lean();res.json({data:{...orderView(order),customerEmail:user?.email||'Deleted account'}});
  }));
}
