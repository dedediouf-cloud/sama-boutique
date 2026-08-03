/** @type {import('next').NextConfig} */
const nextConfig = {
  // === FIX POUR @vercel/blob sur Vercel + Turbopack ===
  serverExternalPackages: ['@vercel/blob'],

  // Force l'inclusion du package dans les fonctions serverless
  outputFileTracingIncludes: {
    'src/app/api/upload/logo/**': [
      './node_modules/@vercel/blob/**',
    ],
  },
};

module.exports = nextConfig;
