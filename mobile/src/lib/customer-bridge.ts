import { CUSTOMER_URL } from "./customer-navigation";

// Only our top-level document receives a native bridge. Cookies remain in the
// WebView; authenticated resumes are fetched there and never opened publicly.
export const CUSTOMER_BRIDGE = `
(() => {
  if (window.top !== window || location.origin !== ${JSON.stringify(CUSTOMER_URL)}) return;
  // Android may run the early injection before a document element exists.
  // Leave the bridge unmarked so the load-complete injection can try again.
  if (!document.documentElement) return;
  const applyStyle = () => {
    if (document.getElementById('budgetworker-native-style')) return;
    const style = document.createElement('style');
    style.id = 'budgetworker-native-style';
    style.textContent = '.bw-mobile-nav, body > footer, #work-with-us, .bw-nav [aria-label="Budget Worker home"] { display: none !important; } .bw-nav span.bw-desktop-only { display: inline-flex !important; } .bw-nav nav { flex-wrap: wrap !important; } .hh-main-pad { padding-top: 16px !important; padding-bottom: 24px !important; } .bw-home-directory { display: flex !important; flex-direction: column; gap: 24px !important; } .bw-directory-hero { order: -2; padding: 8px 0 !important; } .bw-home-directory > section[aria-label="Services"] { order: -1; }';
    (document.head || document.documentElement).appendChild(style);
  };
  applyStyle();
  if (window.__bwCustomer) return;
  window.__bwCustomer = true;
  // Next.js can reconcile the head during hydration and later navigation.
  new MutationObserver(applyStyle).observe(document.documentElement, {childList: true, subtree: true});
  const send = message => window.ReactNativeWebView.postMessage(JSON.stringify(message));

  const report = () => send({type: 'navigation', url: location.href});
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function(...args) { const result = original.apply(this, args); report(); return result; };
  }
  window.addEventListener('popstate', report);
  report();

  // Preserve the website's order creation and signature verification, while
  // presenting Razorpay's native checkout (including installed UPI apps).
  const payments = new Map();
  let paymentSequence = 0;
  window.__bwPaymentResult = async (id, result) => {
    const payment = payments.get(id);
    if (!payment) return;
    payments.delete(id);
    if (result.success) await payment.options.handler?.(result.data);
    else if (result.cancelled) payment.options.modal?.ondismiss?.();
    else if (payment.failed) payment.failed({error: {description: result.message || 'Payment failed. Please retry.'}});
    else payment.options.modal?.ondismiss?.();
  };
  window.Razorpay = class {
    constructor(options) { this.options = options; }
    on(event, handler) { if (event === 'payment.failed') this.failed = handler; }
    open() {
      const id = ++paymentSequence;
      payments.set(id, this);
      send({type: 'payment', id, options: this.options});
    }
  };

  const pending = new Map();
  let sequence = 0;
  window.__bwLocationResult = (id, result) => {
    const entry = pending.get(id);
    if (!entry) return;
    clearTimeout(entry.timer); pending.delete(id);
    if (result.error) entry.fail?.({code: 1, message: result.error});
    else entry.ok(result);
  };
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition = (ok, fail) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id); fail?.({code: 3, message: 'Location timed out. Choose your city and area instead.'});
    }, 30000);
    pending.set(id, {ok, fail, timer}); send({type: 'location', id});
  };

  window.__bwDownload = async value => {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin || !/^\\/api\\/workers\\/[^/]+\\/resume$/.test(url.pathname)) return;
      send({type: 'download-start'});
      const response = await fetch(url.href, {credentials: 'same-origin', redirect: 'error'});
      if (!response.ok) throw Error('Unable to download this resume. Check your login and resume access.');
      if (!response.headers.get('content-type')?.includes('application/pdf')) throw Error('This resume is not available as a PDF.');
      const data = new Uint8Array(await response.arrayBuffer());
      if (data.length > 12 * 1024 * 1024) throw Error('This resume is too large to open in the app.');
      let binary = '';
      for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
      send({type: 'resume', data: btoa(binary)});
    } catch (error) { send({type: 'download-error', message: error.message || 'Unable to open resume.'}); }
  };

  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    if (/^\\/api\\/workers\\/[^/]+\\/resume$/.test(url.pathname)) {
      event.preventDefault(); event.stopImmediatePropagation(); void window.__bwDownload(url.href);
    }
    // Transfer the session using the existing one-use interview browser ticket.
    if (/^\\/interviews\\/[^/]+$/.test(url.pathname) && !['request', 'browser', 'access'].includes(url.pathname.split('/')[2])) {
      event.preventDefault(); event.stopImmediatePropagation();
      const id = url.pathname.split('/')[2];
      fetch('/api/interviews/' + encodeURIComponent(id) + '/browser-ticket', {method: 'POST', credentials: 'same-origin'})
        .then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error || 'Unable to open interview.'); send({type: 'interview', url: data.url}); })
        .catch(error => send({type: 'download-error', message: error.message}));
    }
  }, true);
})(); true;
`;
