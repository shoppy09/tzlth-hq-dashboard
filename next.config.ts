import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // google-auth-library uses Node.js built-ins (crypto, http2, etc.)
  // marking it as external prevents bundling issues in server components
  serverExternalPackages: ['google-auth-library'],
};

export default nextConfig;
