#!/bin/bash

echo "🚀 Starting migration to Next.js..."

# Backup current React app
echo "📦 Creating backup of current React app..."
cp -r src src-react-backup
cp package.json package-react-backup.json

# Install Next.js dependencies
echo "📥 Installing Next.js dependencies..."
npm install next@latest react@latest react-dom@latest
npm install --save-dev eslint-config-next

# Remove React Scripts
echo "🗑️ Removing React Scripts..."
npm uninstall react-scripts

# Update package.json scripts
echo "📝 Updating package.json scripts..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  'dev': 'next dev',
  'build': 'next build',
  'start': 'next start',
  'lint': 'next lint',
  'export': 'next export',
  'firebase:deploy': 'firebase deploy',
  'firebase:functions:deploy': 'firebase deploy --only functions',
  'firebase:hosting:deploy': 'firebase deploy --only hosting'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Create Next.js config
echo "⚙️ Creating Next.js configuration..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['firebasestorage.googleapis.com', 'localhost'],
    formats: ['image/webp', 'image/avif'],
  },
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
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
EOF

# Update Tailwind config
echo "🎨 Updating Tailwind configuration..."
sed -i '' 's|"./src/\*\*/\*.{js,jsx,ts,tsx}"|"./src/pages/\*\*/\*.{js,ts,jsx,tsx,mdx}", "./src/components/\*\*/\*.{js,ts,jsx,tsx,mdx}", "./src/app/\*\*/\*.{js,ts,jsx,tsx,mdx}"|g' tailwind.config.js

# Create app directory structure
echo "📁 Creating Next.js app directory structure..."
mkdir -p src/app

# Move and update components
echo "🔄 Updating component imports..."
find src/components -name "*.jsx" -exec sed -i '' 's|from "\.\./|from "../|g' {} \;
find src/components -name "*.jsx" -exec sed -i '' 's|from "\./|from "./|g' {} \;

# Update environment variables
echo "🔧 Updating environment variables..."
if [ -f .env ]; then
  sed -i '' 's/REACT_APP_/NEXT_PUBLIC_/g' .env
fi

echo "✅ Migration to Next.js completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with NEXT_PUBLIC_ prefix for client-side variables"
echo "2. Test the app with: npm run dev"
echo "3. Build for production with: npm run build"
echo "4. Update Firebase hosting configuration if needed"
echo ""
echo "🔍 Check the following files for any import issues:"
echo "- src/app/layout.jsx"
echo "- src/app/page.jsx"
echo "- All component files in src/components/"
echo ""
echo "📚 For more information, visit: https://nextjs.org/docs"
