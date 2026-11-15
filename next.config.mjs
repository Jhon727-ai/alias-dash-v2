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
  async headers() {
    return [
      {
        // HTML (login, docs, dashboard, dst) — JANGAN pernah di-cache lama.
        // Setelah deploy, HTML lama nyangkut di browser → minta chunk lama yang udah dihapus → 404.
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
        ],
      },
      {
        // Chunk JS/CSS dengan hash di nama file = immutable.
        // Rule ini SETELAH catch-all → untuk key sama, yang belakangan menang di Next.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
