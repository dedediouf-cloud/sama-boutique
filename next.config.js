/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@vercel/blob'],
  outputFileTracingIncludes: {
    'src/app/api/upload/logo/**': [
      './node_modules/@vercel/blob/**',
    ],
  },
};

module.exports = nextConfig;
