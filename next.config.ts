import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["pizzip", "docxtemplater", "googleapis"],
  outputFileTracingIncludes: {
    "/api/applications/process": ["./templates/resume/**/*.docx"],
    "/api/queues/applications": ["./templates/resume/**/*.docx"],
  },
  devIndicators: {
    // appIsrStatus: false,
    // buildActivity: false,
    // buildActivityPosition: 'bottom-right',
  },
};

export default nextConfig;
