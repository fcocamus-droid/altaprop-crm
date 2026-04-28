/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
  images: {
    minimumCacheTTL: 3600,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.imgix.net',
      },
      {
        protocol: 'https',
        hostname: '**.prop360.cl',
      },
    ],
  },
  // Security headers — applied to every response unless overridden by a more
  // specific rule. Subscriber sites get framing relaxed for previews.
  async headers() {
    const baseSecurity = [
      // HSTS — force HTTPS for two years on the apex + every subdomain.
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Tighten ambient capabilities the browser would otherwise grant.
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), payment=(self), usb=()' },
      // Block clickjacking on dashboard / auth surfaces by default.
      { key: 'X-Frame-Options', value: 'DENY' },
    ]
    return [
      {
        // Subscriber-facing tenant sites — keep iframe-able by their own origin
        // for the in-dashboard preview; the rest of the security stack stays.
        source: '/site/:path*',
        headers: [
          ...baseSecurity.filter(h => h.key !== 'X-Frame-Options'),
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/:path*',
        headers: baseSecurity,
      },
    ]
  },
}

module.exports = nextConfig
