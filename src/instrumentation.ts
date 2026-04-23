// 此文件在 Next.js 服务器启动时运行
// 禁用 TLS 证书验证，解决外部 API 证书过期问题
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.log('[Server] TLS certificate verification disabled');

export function register() {
  // 注册函数可以为空
}
