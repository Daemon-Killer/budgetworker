import type { NextConfig } from "next";
import path from "node:path";
const backend = process.env.BUDGETWORKER_API_ORIGIN || "http://127.0.0.1:3000";
const config: NextConfig = {
  turbopack: { root: path.resolve(__dirname, "..") },
  async rewrites() { return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }]; },
};
export default config;
