export const CUSTOMER_URL = (process.env.EXPO_PUBLIC_CUSTOMER_URL ?? "https://budgetworker.in").replace(/\/$/, "");
export const CUSTOMER_TABS = [
  { path: "/", label: "Home", icon: "⌂" },
  { path: "/services", label: "Services", icon: "▦" },
  { path: "/bookings", label: "Bookings", icon: "▤" },
  { path: "/account", label: "Account", icon: "○" },
] as const;

export function isCustomerUrl(value: string, base = CUSTOMER_URL): boolean {
  try {
    const url = new URL(value), origin = new URL(base);
    return url.origin === origin.origin && !url.username && !url.password;
  } catch { return false; }
}

export function isResumeUrl(value: string, base = CUSTOMER_URL): boolean {
  if (!isCustomerUrl(value, base)) return false;
  return /^\/api\/workers\/[^/]+\/resume$/.test(new URL(value).pathname);
}

export function activeCustomerTab(value: string): string {
  try {
    const url = new URL(value);
    // Keep the destination selected during an OTP redirect.
    const path = url.pathname === "/login" ? url.searchParams.get("next") ?? "/account" : url.pathname;
    if (path.startsWith("/bookings")) return "/bookings";
    if (path.startsWith("/account") || path.startsWith("/interviews")) return "/account";
    if (path.startsWith("/services") || path.startsWith("/workers") || path.startsWith("/packs") || path.startsWith("/subscription-price")) return "/services";
  } catch { /* Unrecognized addresses do not select a private destination. */ }
  return "/";
}

// Checkout iframes stay inside the WebView so Razorpay's success callback can
// verify the payment on the website. Bank / UPI apps use the system URL handler.
export function customerNavigation(value: string, base = CUSTOMER_URL): "internal" | "external" | "blocked" {
  if (isCustomerUrl(value, base)) return "internal";
  try {
    const url = new URL(value);
    if (url.username || url.password) return "blocked";
    if (["https:", "tel:", "mailto:", "upi:", "tez:", "phonepe:", "paytmmp:"].includes(url.protocol)) return "external";
  } catch { /* Block malformed and executable URLs. */ }
  return "blocked";
}
