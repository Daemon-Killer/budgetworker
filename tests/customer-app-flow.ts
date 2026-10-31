import assert from 'node:assert/strict';
import vm from 'node:vm';
import { CUSTOMER_BRIDGE } from '../mobile/src/lib/customer-bridge';
import { activeCustomerTab, customerNavigation, isCustomerUrl, isResumeUrl } from '../mobile/src/lib/customer-navigation';

async function main() {
assert(isCustomerUrl('https://budgetworker.in/bookings'));
for (const value of ['https://budgetworker.in.evil.test', 'http://budgetworker.in', 'https://user:secret@budgetworker.in', 'file:///test']) assert(!isCustomerUrl(value));
assert(isResumeUrl('https://budgetworker.in/api/workers/test/resume'));
assert(!isResumeUrl('https://other.test/api/workers/test/resume'));
assert(!isResumeUrl('https://budgetworker.in/api/admin/workers/test/resume'));
assert.equal(customerNavigation('upi://pay?pa=test'), 'external');
assert.equal(customerNavigation('javascript:alert(1)'), 'blocked');
assert.equal(customerNavigation('file:///secret'), 'blocked');
assert.equal(activeCustomerTab('https://budgetworker.in/login?next=/bookings'), '/bookings');
assert.equal(activeCustomerTab('https://budgetworker.in/account/interviews'), '/account');
assert.equal(activeCustomerTab('https://budgetworker.in/services/domestic-help/book'), '/services');

const messages: Record<string, any>[] = [];
let click: (event: unknown) => void = () => {};
let requestedUrl = '';
const scope: any = {
  location: { origin: 'https://budgetworker.in', href: 'https://budgetworker.in/' },
  history: { pushState() {}, replaceState() {} }, navigator: { geolocation: {} },
  document: { documentElement: {}, getElementById: () => null, head: { appendChild() {} }, createElement: () => ({}), addEventListener: (_: string, fn: typeof click) => { click = fn; } },
  MutationObserver: class { observe() {} },
  setTimeout, clearTimeout, Map, URL, Uint8Array, btoa,
  fetch: async (url: string) => { requestedUrl = url; return { ok: true, headers: new Headers({'content-type': 'application/pdf'}), arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4 Synthetic resume').buffer }; },
  ReactNativeWebView: { postMessage: (value: string) => messages.push(JSON.parse(value)) }, addEventListener() {},
};
scope.window = scope; scope.top = scope;
vm.runInNewContext(CUSTOMER_BRIDGE, scope);
assert(scope.__bwCustomer);
assert.equal(messages[0].type, 'navigation');
let verified = false, cancelled = false, failed = false;
const checkout = new scope.Razorpay({ key: 'rzp_test_fixture', order_id: 'order_fixture', amount: 199900, currency: 'INR', handler: async (data: any) => { assert.equal(data.razorpay_signature, 'server-verifies-this'); verified = true; }, modal: { ondismiss: () => { cancelled = true; } } });
checkout.on('payment.failed', () => { failed = true; }); checkout.open();
assert.equal(verified, false, 'Opening checkout cannot mark an order paid');
const payment = messages.at(-1)!;
assert.equal(payment.type, 'payment'); assert.equal(payment.options.amount, 199900);
await scope.__bwPaymentResult(payment.id, { success: true, data: { razorpay_signature: 'server-verifies-this' } });
assert(verified);
checkout.open(); await scope.__bwPaymentResult(messages.at(-1)!.id, { success: false, cancelled: true }); assert(cancelled);
checkout.open(); await scope.__bwPaymentResult(messages.at(-1)!.id, { success: false }); assert(failed);
// Resume checkout has no failed handler; cancellation must still release its UI.
cancelled = false;
const pack = new scope.Razorpay({ modal: { ondismiss: () => { cancelled = true; } } });
pack.open(); await scope.__bwPaymentResult(messages.at(-1)!.id, { success: false }); assert(cancelled);
await scope.__bwDownload('https://budgetworker.in/api/workers/test/resume');
assert.equal(requestedUrl, 'https://budgetworker.in/api/workers/test/resume');
assert.equal(atob(messages.at(-1)!.data).slice(0, 5), '%PDF-');
const count = messages.length;
await scope.__bwDownload('https://evil.test/resume'); assert.equal(messages.length, count);
let located = false;
scope.navigator.geolocation.getCurrentPosition((result: any) => { located = result.coords.latitude === 18; });
scope.__bwLocationResult(messages.at(-1)!.id, { coords: { latitude: 18 } }); assert(located);
let prevented = false;
click({ target: { closest: () => ({href: 'https://budgetworker.in/api/workers/test/resume'}) }, preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
assert(prevented);
// Re-injecting after a full load/SPA update must not install duplicate handlers.
const razorpay = scope.Razorpay; vm.runInNewContext(CUSTOMER_BRIDGE, scope); assert.equal(scope.Razorpay, razorpay);
const untrusted: any = { window: null, location: {origin: 'https://evil.test'} }; untrusted.window = untrusted; untrusted.top = untrusted;
vm.runInNewContext(CUSTOMER_BRIDGE, untrusted); assert.equal(untrusted.__bwCustomer, undefined);
const early: any = {window: null, location: {origin: 'https://budgetworker.in'}, document: {documentElement: null}};
early.window = early; early.top = early;
vm.runInNewContext(CUSTOMER_BRIDGE, early); assert.equal(early.__bwCustomer, undefined, 'An early injection must not disable the load-complete retry');
console.log('PASS: trusted navigation, OTP destination, native checkout success/cancel/failure, authenticated PDF bridge, GPS callbacks, duplicate injection and untrusted-origin rejection.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
