/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api',
    NEXT_PUBLIC_FILE_BASE: process.env.NEXT_PUBLIC_FILE_BASE || 'http://localhost:5003',
  },
};
export default nextConfig;
