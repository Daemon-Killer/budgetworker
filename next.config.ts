import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: [
    "127.0.0.1",
    ...(process.env.BUDGETWORKER_DEV_HOSTS ?? "").split(",").filter(Boolean),
  ],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
