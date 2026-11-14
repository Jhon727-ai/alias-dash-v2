/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
