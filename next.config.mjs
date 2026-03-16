/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bcryptjs'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
