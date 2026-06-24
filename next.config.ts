import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/admin-invoice': ['./node_modules/pdfkit/js/data/**/*'],
    '/api/admin-invoice-bulk': ['./node_modules/pdfkit/js/data/**/*'],
  },
};

export default nextConfig;
