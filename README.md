
# JHPCIC Insurance Protocol (Stage 2)

中国人寿财险前端协议系统 - 用户 **beaumarc** 专用工程版。

## 🚀 快速开始

### 1. 推送代码
```bash
git remote add origin https://github.com/beaumarc/jhpcic.git
git push -u origin main
```

### 2. 本地开发
```bash
npm install
npm run dev
```

### 3. 构建发布
```bash
npm run build
```

## ⚠️ 关键提示
- 本项目已集成 **Gemini 3 视觉识别**，请确保环境变量中配置了 `API_KEY`。
- 部署至 Cloudflare 时，务必绑定 KV 命名空间至 `JHPCIC_STORE`。

## 📚 详细文档
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [移交说明](./HANDOVER_README.md)
