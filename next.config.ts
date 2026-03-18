import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⚠️ SECURITY NOTE (Finding #8):
  // Ignoring ESLint/TS errors during builds hides security-relevant warnings.
  // Remove these once all lint & type errors are properly resolved.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
