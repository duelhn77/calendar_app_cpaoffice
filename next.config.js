/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Vercel デプロイ時の推奨設定
};

module.exports = nextConfig;

