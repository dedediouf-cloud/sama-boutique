/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@vercel/blob'],
  outputFileTracingIncludes: {
    'src/app/api/upload/logo/**': [
      './node_modules/@vercel/blob/**',
    ],
  },
};

// ============================================================================
//  EN-TÊTES DE SÉCURITÉ HTTP
// ============================================================================
//  Sans eux, un site peut être placé dans une iframe invisible (clickjacking),
//  le navigateur peut deviner le type des fichiers, et le site peut être
//  chargé en HTTP non chiffré.
// ============================================================================
nextConfig.headers = async () => [
  {
    source: "/(.*)",
    headers: [
      // Empêche l'affichage du site dans une iframe (anti-clickjacking)
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // Empêche le navigateur de « deviner » le type des fichiers
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Force HTTPS pendant 2 ans
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      // Ne transmet pas l'adresse complète aux sites externes
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Désactive les fonctions inutiles du navigateur
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // Autorise le site à s'afficher seulement depuis lui-même
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ],
  },
];

module.exports = nextConfig;
