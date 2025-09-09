/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['bucket.theholylabs.com'],
  },
  // Vercel optimization
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  webpack: (config, { isServer }) => {
    // Exclude undici completely from webpack processing
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        undici: 'undici',
        'node:http': 'node:http',
        'node:https': 'node:https',
        'node:url': 'node:url',
        'node:stream': 'node:stream',
        'node:crypto': 'node:crypto',
      });

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        undici: false,
        'node:http': false,
        'node:https': false,
        'node:url': false,
        'node:stream': false,
        'node:crypto': false,
      };
    }

    // Ignore undici files completely
    config.module.rules.push({
      test: /node_modules\/undici/,
      use: 'null-loader',
    });

    return config;
  },
  transpilePackages: [],
  // Disable SSR for Firebase components to prevent hydration issues
  experimental: {
    esmExternals: 'loose',
  },
}

module.exports = nextConfig
