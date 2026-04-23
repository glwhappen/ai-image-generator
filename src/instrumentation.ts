// 此文件在 Next.js 服务器启动时运行
// 仅在开发环境禁用 TLS 证书验证
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('[DEV] TLS certificate verification disabled');
}

export function register() {
  // 注册函数可以为空
}
