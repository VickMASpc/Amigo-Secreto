import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const ts = readFileSync('src/utils/wishBundles.ts', 'utf8');
const code = (await transform(ts, { loader: 'ts', format: 'esm' })).code;
const { resolveLinkedBundles, totalWithShipping } = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

const product = {id:'a',ownerId:'victor',kind:'store',title:'Blusa',price:79.9,shippingEstimate:15,image:'data:image/png;base64,abc',variantInfo:'Tamanho M',url:'',storeName:'Shopee',description:'',subItems:[]};
const free = {...product,id:'b',ownerId:'bianca',kind:'misc',title:'Meias',price:0,shippingEstimate:0,image:''};
const legacy = {id:'old',title:'Livro antigo',kind:'store',price:17,url:'',storeName:'',image:'',notes:''};
const bundle = {...product,id:'combo',kind:'bundle',price:96.9,shippingEstimate:4,title:'Combo',subItems:[
 {id:'a',sourceItemId:'a',title:'Nome antigo',price:1,kind:'store',url:'',storeName:'',image:'',notes:''},
 {id:'b',sourceItemId:'b',title:'Nome antigo 2',price:1,kind:'store',url:'',storeName:'',image:'',notes:''},
 legacy]};
const result=resolveLinkedBundles([product,free,bundle]);
const resolved=result[2];
assert.equal(resolved.subItems[0].title,'Blusa');
assert.equal(resolved.subItems[0].price,79.9);
assert.equal(resolved.subItems[0].image,product.image);
assert.equal(resolved.subItems[1].kind,'misc');
assert.equal(resolved.subItems[1].sourceOwnerId,'bianca');
assert.equal(resolved.subItems[1].price,0);
assert.equal(resolved.subItems[2].title,'Livro antigo');
assert.equal(resolved.price,96.9);
assert.equal(totalWithShipping(resolved),100.9);
assert.equal(resolveLinkedBundles([free,bundle]).at(-1).subItems[0].title,'Nome antigo');
assert.equal(resolveLinkedBundles([free,bundle]).at(-1).subItems[0].price,1);
assert.equal(resolveLinkedBundles([product,{...bundle,ownerId:'wellington'}]).at(-1).subItems[0].price,79.9);
assert.equal(resolveLinkedBundles([product,{...bundle,ownerId:'wellington'}]).at(-1).subItems[0].sourceOwnerId,'victor');
assert.equal(resolveLinkedBundles([product,free,{...bundle,subItems:[]}]).at(-1).price,0);
assert.equal(product.price,79.9);
console.log('Wishlist bundle and shipping checks passed');
