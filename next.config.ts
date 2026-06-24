import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/admin-invoice': ['./pass-assets/**/*'],
    '/api/admin-invoice-bulk': ['./pass-assets/**/*'],
  },
};

export default nextConfig;
