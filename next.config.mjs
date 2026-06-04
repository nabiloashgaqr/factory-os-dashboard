/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Local logo lives in /public, so no remotePatterns needed.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
