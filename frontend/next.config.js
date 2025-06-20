/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_BACKEND_URL} https://api.openai.com`,
              "font-src 'self'",
              "frame-src 'self'",
              "media-src 'self' blob:"
            ].join('; ')
          },
          { 
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Forwarded-For',
            value: '104.239.105.125'
          }
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
