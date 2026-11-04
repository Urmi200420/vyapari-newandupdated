import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseState, addItem, cartLines, totals, placeOrder } from '../src/customer/store.js';
import { products } from '../src/customer/data.js';
import { createComplaint, validateImageFiles } from '../src/customer/complaintService.js';
const input = (s, extra={}) => ({requestId:'request-1', orderId:s.orders[0].id, productId:s.orders[0].items[0].id, category:'Damaged Product', description:'The product arrived with a large visible crack in its packaging.', images:[], ...extra});
test('existing browser state migrates without losing carts, profiles, addresses or orders', () => {
 const legacy=freshState(); delete legacy.complaints; delete legacy.customerId; legacy.cart=[{id:1,quantity:2}];
 const migrated=parseState(JSON.stringify(legacy)); assert.deepEqual(migrated.cart,legacy.cart); assert.deepEqual(migrated.orders,legacy.orders); assert.deepEqual(migrated.profile,legacy.profile); assert.deepEqual(migrated.addresses,legacy.addresses); assert.deepEqual(migrated.complaints,[]); assert.ok(migrated.customerId); assert.equal(parseState('{broken'),null);
});
test('all cart additions use canonical product IDs, merge duplicates and preserve stock checks', () => {
 let s=addItem(freshState(),1); s=addItem(s,1); assert.deepEqual(s.cart,[{id:1,quantity:2}]); const line=cartLines(s.cart)[0]; assert.equal(line.image,products[0].image); assert.equal(line.sellerId,products[0].sellerId); assert.equal(totals(cartLines(s.cart)).total,207); assert.throws(()=>addItem(s,8)); assert.throws(()=>addItem(s,1,100));
 const result=placeOrder(s,s.addresses[0].id); assert.equal(result.state.cart.length,0); assert.equal(result.order.payment,'Cash on Delivery'); assert.equal(result.order.items[0].quantity,2);
});
test('complaints bind to customer, purchased product and exact order, with immutable snapshots', () => {
 const s=freshState(); const before=JSON.stringify(s); const {state,complaint}=createComplaint(s,input(s)); assert.equal(complaint.status,'Submitted'); assert.equal(complaint.customerId,s.customerId); assert.equal(complaint.orderId,s.orders[0].id); assert.equal(complaint.product.id,s.orders[0].items[0].id); assert.ok(complaint.id.startsWith('CMP-')); assert.ok(Number.isFinite(Date.parse(complaint.date))); assert.equal(complaint.resolutionRemarks,''); assert.deepEqual(complaint.responses,[]); assert.equal(JSON.stringify(s),before); assert.equal(parseState(JSON.stringify(state)).complaints[0].id,complaint.id);
});
test('repeated submission token is idempotent and independent complaints get unique IDs', () => {
 const s=freshState(); const first=createComplaint(s,input(s)); const repeated=createComplaint(first.state,input(s)); assert.equal(repeated.complaint.id,first.complaint.id); assert.equal(repeated.state.complaints.length,1); const second=createComplaint(first.state,input(s,{requestId:'request-2'})); assert.notEqual(second.complaint.id,first.complaint.id); assert.equal(second.state.complaints.length,2);
});
test('invalid complaint requests, unpurchased items and guest actions are rejected', () => {
 const s=freshState(); for(const extra of [{orderId:'unknown'},{productId:999},{category:''},{category:'Fake category'},{description:'  '},{description:'short'},{description:'x'.repeat(2001)},{requestId:''}]) assert.throws(()=>createComplaint(s,input(s,extra))); assert.throws(()=>createComplaint({...s,mode:'guest'},input(s)));
});
test('image file rules reject unsupported, empty, oversized and excessive attachments', () => {
 const image={type:'image/png',size:100}; assert.doesNotThrow(()=>validateImageFiles([image])); assert.doesNotThrow(()=>validateImageFiles([])); for(const files of [[{type:'image/svg+xml',size:100}],[{type:'image/png',size:0}],[{type:'image/png',size:524289}],Array(4).fill(image),Array(3).fill({type:'image/png',size:500000})]) assert.throws(()=>validateImageFiles(files));
});
test('complaints survive cart changes and checkout without changing their status or responses', () => {
 let s=freshState(); s=createComplaint(s,input(s)).state; s=addItem(s,2); s=placeOrder(s,s.addresses[0].id).state; assert.equal(s.complaints.length,1); assert.equal(s.complaints[0].status,'Submitted'); assert.deepEqual(s.complaints[0].responses,[]);
});
