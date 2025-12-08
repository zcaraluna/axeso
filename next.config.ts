import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimizaciones para producción
  // output: 'standalone', // Comentado: causa problemas con middleware y requiere comando diferente
  compress: true,
  poweredByHeader: false,
  
  // Configuración de imágenes
  images: {
    unoptimized: true, // Para VPS sin optimización de imágenes
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
