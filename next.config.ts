import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // Reduce timeout to fail faster and use cache
    runtimeCaching: [
      {
        urlPattern: /^https?.*/, // Match all requests
        handler: "NetworkFirst",
        options: {
          cacheName: "offlineCache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 3, // Reduced from 10s to 3s for faster fallback
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {}, // Silence Turbopack warning - PWA plugin uses webpack
};

export default withPWA(nextConfig);
