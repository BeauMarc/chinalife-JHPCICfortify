# 📂 Project Handover: JHPCIC (Stage 2)

**Date:** 2024-05-20
**From:** AI Assistant / Frontend Lead
**To:** Engineering Team

## 1. 项目概况 (Overview)
本项目（中国人寿财险前端协议系统）已完成从 **Stage 1 (纯静态)** 向 **Stage 2 (云端工程化)** 的架构迁移。

*   **当前版本**: v2.0.0 (Cloudflare Integrated)
*   **核心目标**: 解决 URL Base64 编码过长导致微信/支付宝扫码失败的问题。
*   **主要变更**: 引入 Cloudflare Pages Functions + KV 存储，实现“短链接”生成与解析。

## 2. 技术栈 (Tech Stack)
*   **Build Tool**: Vite 5.2 (替换了原有的纯 HTML 引入方式)
*   **Framework**: React 18 (SPA, HashRouter)
*   **Styling**: Tailwind CSS (CDN/PostCSS)
*   **Backend**: Cloudflare Pages Functions (Serverless)
*   **Database**: Cloudflare Workers KV (Key-Value Storage)

## 3. 目录结构 (Directory Structure)

```text
/
├── functions/              # [后端] Cloudflare Serverless 逻辑
│   └── api/
│       ├── save.js         # POST: 存数据 -> 返回 ID
│       └── get.js          # GET:  用 ID -> 取数据
├── pages/                  # [前端] React 页面组件
│   ├── Admin.tsx           # 录入端 (Autopay)
│   ├── Buffer.tsx          # 中转页 (4秒强制停留)
│   └── ClientIndex.tsx     # 客户端 (条款/签字/支付)
├── utils/                  # 工具函数 (编解码)
├── dist/                   # 构建产物 (由 npm run build 生成)
├── package.json            # 依赖定义
├── vite.config.ts          # 构建配置
└── wranger.toml            # (可选) Cloudflare 本地调试配置
```

## 4. 快速开始 (Quick Start)

### 安装依赖
```bash
npm install
```

### 本地开发 (Dev Mode)
*注意：本地模式下，`/api/*` 接口可能无法连接真实 KV，前端会自动降级为 Base64 模式。*
```bash
npm run dev
```

### 构建生产包 (Build)
```bash
npm run build
# 产物位于 dist/ 目录
```

## 5. 部署注意事项 (Critical for DevOps)

本项目强依赖 **Cloudflare KV**。部署时请务必执行以下绑定操作，否则 API 会报 500 错误。

1.  **KV Namespace**: 在 Cloudflare Dashboard 创建一个 KV 命名空间（建议命名 `JHPCIC_KV`）。
2.  **Binding**: 在 Pages 项目设置 -> Functions -> KV Namespace Bindings 中添加绑定：
    *   **Variable Name**: `JHPCIC_STORE` (⚠️ 必须精确匹配，不可更改)
    *   **Value**: 选择上一步创建的 `JHPCIC_KV`

## 6. 核心逻辑说明

### 混合链路 (Hybrid Data Flow)
前端实现了自动降级策略 (`pages/Admin.tsx`)：
1.  **优先**: 尝试 POST `/api/save` (Cloudflare KV)。
    *   成功 -> 生成短链 `.../#/buffer?id=UUID`。
2.  **降级**: 若 API 超时 (3秒) 或 失败 (500/404)。
    *   自动回退 -> 生成长链 `.../#/buffer?data=Base64...`。

### 微信兼容性
*   短链接模式已验证可完美在微信中打开。
*   Base64 长链在部分安卓微信版本中可能因 URL 截断而失效（这也是升级 Stage 2 的原因）。

---
**End of Handover Document**
