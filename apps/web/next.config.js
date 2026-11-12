/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV || !!process.env.VERCEL;
const isProd = process.env.NODE_ENV === 'production';

// Trên Vercel hoặc local dev: chạy ở root domain ("")
// Khi build tĩnh cho cPanel trường (it24m.dak.edu.vn): dùng subpath "/huynhchivi/doan"
let basePath = '';
if (!isVercel) {
  basePath = process.env.NEXT_PUBLIC_BASE_PATH !== undefined 
    ? process.env.NEXT_PUBLIC_BASE_PATH 
    : (isProd ? '/huynhchivi/doan' : '');
}

const nextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
