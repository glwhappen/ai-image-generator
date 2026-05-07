/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署需要 standalone 输出
  output: 'standalone',
  allowedDevOrigins: ['*.dev.coze.site'],
  // 将 coze-coding-dev-sdk 标记为外部包，避免 webpack 打包问题
  serverExternalPackages: ['coze-coding-dev-sdk'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 在服务端将 coze-coding-dev-sdk 标记为外部依赖
      // 使用 commonjs 格式，确保 Node.js 可以正常 require
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'coze-coding-dev-sdk': 'commonjs coze-coding-dev-sdk',
        });
      }
    }
    return config;
  },
};

module.exports = nextConfig;
