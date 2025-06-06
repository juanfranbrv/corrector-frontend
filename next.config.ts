import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Ignora errores de ESLint durante la construcción
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wknrbtukiqpawrqnoyzg.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/exam-images/**',
      },
    ],
  },
};

export default nextConfig;
