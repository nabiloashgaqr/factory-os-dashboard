/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Local logo lives in /public, so no remotePatterns needed.
  images: {
    remotePatterns: [],
  },
  // Allow this dashboard to be embedded inside Notion (and other hosts) via
  // an <iframe>. We intentionally do NOT send X-Frame-Options: DENY, and we
  // set a permissive frame-ancestors policy so the embed renders everywhere.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.notion.so https://*.notion.site https://www.notion.so *;",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
