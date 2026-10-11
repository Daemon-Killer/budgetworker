import type { NextConfig } from "next";
import path from "node:path";
const backend = process.env.BUDGETWORKER_API_ORIGIN || "http://127.0.0.1:3000";
const embedded = process.env.BUDGETWORKER_EMBEDDED_EXPORT === "1";
const config: NextConfig = {
  ...(embedded ? { output: "export", basePath: "/saathi", distDir: ".next-embedded" } : {}),
  turbopack: { root: path.resolve(__dirname, "..") },
  ...(!embedded ? { async rewrites() { return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }]; } } : {}),
};
export default config;
