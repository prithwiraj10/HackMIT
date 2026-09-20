import type { NextConfig } from "next";
import path from "node:path";

// Hosts allowed to invoke Server Actions (admin sign-in/out) when the app is
// reached through a reverse proxy that rewrites the Origin header.
const proxyHosts = ["localhost", "localhost:3000", "127.0.0.1:3000"].concat(
  (process.env.SERVER_ACTION_ORIGINS ?? "*.preview.devinapps.com")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
);

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(__dirname) },
  devIndicators: false,
  allowedDevOrigins: proxyHosts.map((host) => host.replace(/:\d+$/, "")),
  experimental: { serverActions: { allowedOrigins: proxyHosts } },
};
export default nextConfig;
