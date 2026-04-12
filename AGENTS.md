# AGENTS.md - AI 创作室项目指南

## 项目概览

AI 创作室是一个多模型图片生成 Web 应用，支持 Gemini 和 OpenAI 两种 API 格式，提供异步图片生成、图生图、提示词优化、社区画廊、互动统计等功能。

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **样式**: Tailwind CSS 4 + Shadcn UI (Radix UI)
- **数据库**: Supabase (REST API) 或 PostgreSQL 直连（自动检测）
- **ORM**: Drizzle ORM（schema 定义在 `src/storage/database/shared/schema.ts`）
- **对象存储**: S3 兼容（MinIO / COZE 托管存储）
- **图片处理**: Sharp（缩略图生成、尺寸获取）
- **图标**: Lucide React
- **包管理**: pnpm（严禁 npm/yarn）

## 构建 & 运行命令

```bash
# 开发
pnpm dev                # 启动开发服务器 (端口 5000)
pnpm ts-check           # TypeScript 类型检查
pnpm lint               # ESLint 检查

# 生产
pnpm build              # 构建
pnpm start              # 启动生产服务 (端口 5000)
```

注意：`dev`/`build`/`start` 实际执行的是 `scripts/` 目录下的 shell 脚本，不要直接使用 `next dev/build/start`。

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页 - 创作主界面（提示词输入 + 最近作品）
│   ├── gallery/page.tsx      # 画廊页 - 公开作品展示（瀑布流 + 互动统计）
│   ├── about/page.tsx        # 关于页 - 功能介绍
│   ├── layout.tsx            # 根布局
│   └── api/
│       ├── images/
│       │   ├── route.ts                # GET: 用户图片列表
│       │   ├── generate/route.ts       # POST: 提交生成任务（异步）
│       │   ├── interact/route.ts       # POST: 互动（浏览/点赞/点踩/创作）
│       │   └── [id]/
│       │       ├── route.ts            # GET/PATCH/DELETE: 单张图片操作
│       │       ├── file/route.ts       # GET: 图片文件（稳定 URL，支持缓存）
│       │       ├── public/route.ts     # PATCH: 切换公开状态
│       │       └── thumbnail/route.ts  # GET: 缩略图
│       ├── gallery/route.ts            # GET: 公开画廊数据
│       ├── generate/route.ts           # POST: 同步生成（旧接口，保留兼容）
│       ├── models/route.ts             # GET: 获取可用模型列表
│       ├── prompt/enhance/route.ts     # POST: AI 提示词优化/改写
│       ├── user/init/route.ts          # POST: 用户初始化（token → userId）
│       ├── image-proxy/route.ts        # GET: 图片代理（跨域 + 缓存）
│       ├── env/route.ts                # GET: 环境变量（脱敏）
│       ├── health/route.ts             # GET: 健康检查
│       └── db-test/route.ts            # GET: 数据库连接测试
├── components/
│   ├── ImageGallery.tsx       # 图片列表（瀑布流，支持所有状态）
│   ├── ImagePreviewPanel.tsx  # 图片预览底部操作栏
│   ├── ImageViewer.tsx        # 全屏图片查看器
│   ├── ModelSelector.tsx      # 模型选择器
│   ├── ProviderSelector.tsx   # 供应商切换器
│   ├── SizeSelector.tsx       # 尺寸/宽高比选择器
│   ├── ReferenceImageUploader.tsx  # 参考图上传（图生图）
│   ├── SettingsPanel.tsx      # 设置面板（API 配置 + 提示词模板）
│   ├── SmartMasonry.tsx       # 智能瀑布流（按高度分配列）
│   └── ui/                    # Shadcn UI 组件库
├── hooks/
│   ├── useAppState.ts         # 核心状态管理（API 配置、图片列表、用户身份）
│   └── use-mobile.ts          # 移动端检测
├── lib/
│   ├── storage.ts             # 对象存储（S3/COZE 托管，上传/签名/缩略图）
│   ├── user.ts                # 用户 token 管理（localStorage UUID）
│   └── utils.ts               # 工具函数（cn 等）
├── storage/database/
│   ├── supabase-client.ts     # Supabase REST API 客户端
│   ├── postgres-client.ts     # PostgreSQL 直连客户端
│   └── shared/
│       ├── schema.ts          # Drizzle ORM schema（users, images 表）
│       └── relations.ts       # 表关系定义
└── types/
    ├── index.ts               # 类型定义（ApiProvider, ImageRecord, 模型配置等）
    └── database.ts            # 数据库类型
```

## 核心数据流

### 图片生成流程（异步）

1. 用户提交 → `POST /api/images/generate` → 创建 pending 记录 → 立即返回 imageId
2. 后台 `generateImageAsync()` 执行实际生成 → 调用 Gemini/OpenAI API
3. 前端每 3 秒轮询 `GET /api/images?userId=xxx` 检查 pending/processing 状态
4. 生成完成 → base64 上传到 S3 → 生成缩略图 → 更新记录为 completed

### 用户身份

- 客户端 `localStorage` 生成 UUID token → `POST /api/user/init` 换取服务端 userId
- token 存储在 `localStorage['ai-image-user-token']`
- userId 用于关联所有图片记录

### 数据库双模式

- `supabase-client.ts` 自动检测 URL 类型：
  - `https://` 开头 → Supabase REST API
  - `postgresql://` / `postgres://` → PostgreSQL 直连
- 两种模式对外暴露相同的链式 API（`.from().select().eq()` 等）

## 环境变量

| 变量 | 用途 |
|------|------|
| `COZE_SUPABASE_URL` | 数据库 URL（Supabase HTTPS 或 PostgreSQL 连接串） |
| `COZE_SUPABASE_ANON_KEY` | Supabase Anon Key（REST API 模式需要） |
| `COZE_BUCKET_ENDPOINT_URL` | 对象存储 Endpoint |
| `COZE_BUCKET_NAME` | 对象存储 Bucket 名称 |
| `COZE_BUCKET_ACCESS_KEY` | S3 Access Key |
| `COZE_BUCKET_SECRET_KEY` | S3 Secret Key |
| `COZE_BUCKET_REGION` | S3 Region（默认 us-east-1） |
| `COZE_WORKLOAD_IDENTITY_API_KEY` | COZE 托管存储身份密钥 |

## 代码风格指南

- 使用 `@/` 路径别名（映射到 `src/`）
- 组件使用 `'use client'` 标记客户端组件
- 样式使用 Tailwind 语义化变量（`bg-background`, `text-foreground` 等），禁止硬编码颜色
- Shadcn UI 组件位于 `src/components/ui/`，不要手动修改
- React 17+ 不需要 `import React from 'react'`（除非使用 `React.xxx`）
- 图片 URL 处理：对象存储 key 通过 `/api/images/[id]/file` 代理访问，不直接暴露签名 URL

## 常见问题 & 修复

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 用户初始化 500 | users.id 字段长度不足 | 扩展到 128 字符 |
| 图片预览布局跳动 | 原图加载后替换缩略图 | 层叠显示，仅切换 opacity |
| 画廊某列特别长 | CSS columns 随机分配 | 使用 SmartMasonry 按高度智能分配 |
| 创作链接 414 | URL 参数过长 | 使用 sessionStorage 存数据，URL 只传 ID |
| "直接生成"阻塞 | 同步等待生成完成 | 改为后台执行，立即返回 |
| 失败状态 logo/按钮重叠 | Globe 图标与编辑按钮位置冲突 | 公开图标仅在完成状态显示，失败状态内联显示 |

## 数据库 Schema

### users 表

| 列 | 类型 | 说明 |
|----|------|------|
| id | varchar(36) PK | 用户 ID（UUID） |
| token | varchar(64) UNIQUE | 客户端生成的 token |
| created_at | timestamptz | 创建时间 |

### images 表

| 列 | 类型 | 说明 |
|----|------|------|
| id | varchar(36) PK | 图片 ID |
| user_id | varchar(36) | 所属用户 |
| prompt | text | 提示词 |
| model | varchar(128) | 模型名 |
| provider | varchar(32) | 供应商（gemini/openai） |
| status | varchar(32) | 状态（pending/processing/completed/failed） |
| image_url | text | 图片 URL 或 S3 key |
| thumbnail_url | text | 缩略图 URL 或 S3 key |
| error_message | text | 错误信息 |
| is_public | boolean | 是否公开 |
| config | jsonb | 生成配置（宽高比、尺寸、参考图等） |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |
