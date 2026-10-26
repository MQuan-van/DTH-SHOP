import { randomUUID } from 'node:crypto';
import { defaultPresentation21, presentationState21, presentationSaveCommand21, isProductId21, isPresentationModel21, PresentationError21 } from '../../../shared/productPresentation21.mjs';
const route=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(error=>{
  if(error instanceof PresentationError21)return res.status(error.status).json({message:error.message});
  next(error);
});
const clean=doc=>{const result={...doc};delete result._id;delete result.__v;return result;};
export function installProductPresentation21(router,{Product,authenticated,admin,writeLimit}) {
  const guards=[authenticated,admin];
  const productFor=async id=>{
    if(!isProductId21(id))throw new PresentationError21('Product not found.',404);
    const product=await Product.findOne({id}).lean();
    if(!product)throw new PresentationError21('Product not found.',404);
    if(!isPresentationModel21(product.modelUrl))throw new PresentationError21('This product needs a valid local GLB URL before setting up 3D.',409);
    return product;
  };
  router.get('/admin/studio/products/:id/presentation',...guards,route(async(req,res)=>{
    const product=await productFor(req.params.id),state=presentationState21(product);
    res.set('Cache-Control','no-store').json({data:{product:clean(product),status:state.status,settings:state.settings||defaultPresentation21(product.modelUrl)}});
  }));
  router.put('/admin/studio/products/:id/presentation',...guards,writeLimit,route(async(req,res)=>{
    const previous=await productFor(req.params.id);
    const command=presentationSaveCommand21(req.body,previous,randomUUID());
    const product=await Product.findOneAndUpdate(command.filter,command.update,{new:true,runValidators:true}).lean();
    if(!product)throw new PresentationError21('Another editor saved first. Reload before saving the 3D setup.',409);
    res.set('Cache-Control','no-store').json({data:{product:clean(product),status:'saved',settings:product.presentation3d.settings}});
  }));
}
