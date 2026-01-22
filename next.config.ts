import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent Next dev from inferring the wrong root when multiple lockfiles exist.
    root: path.resolve(__dirname),
  },
  output: 'standalone',
};

export default nextConfig;
