import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⚠️ SECURITY NOTE (Finding #8):
  // Ignoring TS errors during builds hides security-relevant warnings.
  // Remove this once all type errors are properly resolved.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
